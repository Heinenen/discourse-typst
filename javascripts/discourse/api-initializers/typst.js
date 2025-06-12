import { apiInitializer } from "discourse/lib/api";
import { ajax } from "discourse/lib/ajax";
import { Promise } from "rsvp";

let webWorker;

const webWorkerUrl = settings.theme_uploads_local.worker;
const wasmGlueUrl = settings.theme_uploads_local.wasmGlue;
const fontUrls = [
    settings.theme_uploads.font1,
    settings.theme_uploads.font2,
    settings.theme_uploads.font3,
    settings.theme_uploads.font4,
    settings.theme_uploads.font5,
    settings.theme_uploads.font6,
    settings.theme_uploads.font7,
    settings.theme_uploads.font8,
    settings.theme_uploads.font9,
    settings.theme_uploads.font10,
    settings.theme_uploads.font11,
    settings.theme_uploads.font12,
    settings.theme_uploads.font13,
    settings.theme_uploads.font14,
]
const wasmUrl = settings.theme_uploads.wasm;

function uploadSvgString(svgString) {
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const file = new File([blob], "image.svg", { type: "image/svg+xml" });
    return uploadSvgFile(file)
}

function uploadSvgFile(file) {
    const formData = new FormData();
    formData.append("upload_type", "composer"); // required by Discourse
    formData.append("file", file);

    return ajax("/uploads.json", {
        method: "POST",
        data: formData,
        processData: false,
        contentType: false,
    });
}

function simpleHash(string) {
  var hash = 0;
  var i, chr;
  if (string.length === 0) return hash;
  for (i = 0; i < string.length; i++) {
    chr = string.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    // Convert to 32bit integer
    hash |= 0;
    // Convert to hex string of fixed length
    hash = ('00000000' + hash.toString(16).toUpperCase()).slice(-8)
  }
  return hash;
}


function buildDisplay(block, cooked) {
    let snippet_result = document.createElement("div");
    snippet_result.classList.add("snippet-result")

    let snippet_ctas = document.createElement("div");
    snippet_ctas.classList.add("snippet-ctas")

    let snippet_result_code = document.createElement("div");
    snippet_result_code.classList.add("snippet-result-code")

    let snippet_box_edit = document.createElement("div")
    snippet_box_edit.classList.add("snippet-box-edit")

    let pages = document.createElement("div")
    pages.classList.add("pages")

    cooked.forEach((svg, idx) => {
        let node = document.createElement("div");
        node.classList.add("page")
        node.innerHTML = svg;
        pages.append(node);
    })

    snippet_box_edit.append(pages)
    snippet_result_code.append(snippet_box_edit)
    snippet_result.append(snippet_ctas, snippet_result_code)
    block.appendChild(snippet_result);

    panzoom(pages, {
        transformOrigin: { x: 0, y: 0 },
        beforeWheel: function (e) {
            // allow wheel-zoom only if ctrlKey is down. Otherwise - ignore
            var shouldIgnore = !e.ctrlKey;
            return shouldIgnore;
        },
        beforeMouseDown: function (e) {
            // disable panning
            return true;
        }
    })
}

async function applyTypst(element, key = "composer") {
    let typst_blocks = element.querySelectorAll("pre[data-code-wrap=typst][data-code-render=true]")
    if (!typst_blocks.length) {
        return;
    }

    // TODO add spinner if rendering/downloading compiler takes too long
    // svgbob implements something similar

    typst_blocks.forEach(async (block, index) => {
        if (block.dataset.processed) {
            return;
        }

        const code = block.querySelector("code");

        if (!code) {
            block.dataset.processed = "true";
            return;
        }

        let remove_preamble = block.getAttribute("data-code-preamble") == "false"
        let cooked = await cookTypst(code.innerText, remove_preamble);

        block.dataset.processed = "true";
        buildDisplay(block, cooked);
    });
}

let messageSeq = 0;
let resolvers = {};

async function cookTypst(text, remove_preamble = false) {
    let seq = messageSeq++;

    if (!webWorker) {
        webWorker = new Worker(webWorkerUrl, { type: "module" });
        webWorker.postMessage(["wasmUrl", wasmUrl, wasmGlueUrl, fontUrls]);
        webWorker.onmessage = function (e) {
            let incomingSeq = e.data[0];
            let converted = e.data[1];

            resolvers[incomingSeq](converted);
            delete resolvers[incomingSeq];
        };
    }

    let message_text = text;
    if (!remove_preamble) {
        message_text = settings.preamble + "\n" + message_text
    }

    let message = [seq, message_text];
    webWorker.postMessage(message);

    let promise = new Promise((resolve, reject) => {
        resolvers[seq] = resolve;
    });

    return promise;
}

function findTypstBlock(msgContent) {
    const regex = /```(tr\n)(?<source>(?:\n|.)*)```/
    let match = msgContent.match(regex);
    return match;
}

function containsRenderedBlock(msgContent, hash) {
    const regex = /!\[svg\|source-hash-(?<hash>[0-9a-fA-F]{8})\]\(.*\)/g
    let match = msgContent.matchAll(regex)?.find((it) => it.groups.hash === hash);
    return match != undefined
}

async function processTypst(regexMatch) {
    let typstSource = regexMatch.groups.source;
    let cooked = await cookTypst(typstSource)
    return cooked
}


export default apiInitializer("1.13.0", (api) => {
    // this is a hack as applySurround expects a top level
    // composer key, not possible from a theme component
    window.I18n.translations[window.I18n.locale].js.composer.typst_sample = "${ x in RR | x \"is natural\"and x < 10 }$";

    api.addComposerToolbarPopupMenuOption({
        icon: "code",
        label: themePrefix("render_typst"),
        action: (toolbarEvent) => {
            toolbarEvent.applySurround("\n```typst render=true\n", "\n```\n", "typst_sample", {
                multiline: false,
            });
        },
    });

    api.composerBeforeSave(function () {
        return new Promise((resolve) => {
            let typstBlock = findTypstBlock(this.reply);
            if (typstBlock == null) {
                resolve();
                return;
            }
            // TODO: maybe include compiler version into the hash
            // TODO: maybe increase bits of hash function to reduce collisions
            const sourceHash = simpleHash(typstBlock[0])
            if (containsRenderedBlock(this.reply, sourceHash)) {
                console.info("typst code already compiled")
                resolve();
                return;
            }

            processTypst(typstBlock).then((svgStrings) => {
                return svgStrings[0];
            }).then((svgString) => {
                uploadSvgString(svgString).then((upload) => {
                    if (upload && upload.url) {
                        console.log(`Uploaded rendered Typst to ${upload.url}`)
                        // Append image markdown to post
                        this.set("reply", `${this.reply}\n\n![svg|source-hash-${sourceHash}](${upload.url})`)
                    }
                    resolve();
                });
            })
        })
    })

    api.decorateCookedElement(
        async (elem, helper) => {
            const post = helper?.getModel();
            const id = post ? `post_${post.id}` : "composer";
            applyTypst(elem, id);
        },
        { id: "discourse-typst" }
    );
});


// typst font urls: https://typst.app/assets/fonts/Charter-Regular.ttf