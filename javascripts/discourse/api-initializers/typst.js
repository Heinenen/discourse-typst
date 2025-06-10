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

async function processTypst(regexMatch) {
    let typstSource = regexMatch.groups.source;
    let cooked = await cookTypst(typstSource)
    console.log(cooked)
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
            processTypst(findTypstBlock(this.reply)).then((svgStrings) => {
                // let svgString = svgStrings[0];
                // console.log("heyo" + svgString)
                return svgStrings[0];
            }).then((svgString) => {
                console.log(svgString)
                // const svgString =
                //     `<!-- house icon by Free Icons (https://free-icons.github.io/free-icons/) --> <svg xmlns="http://www.w3.org/2000/svg" height="32px" fill="currentColor" viewBox="0 0 512 512"> <path d="M 511.11265164644715 256.4436741767764 Q 510.2253032928943 267.9792027729636 502.23916811091857 275.96533795493934 L 502.23916811091857 275.96533795493934 L 502.23916811091857 275.96533795493934 Q 494.2530329289428 283.95147313691507 482.71750433275565 284.8388214904679 L 454.3223570190641 284.8388214904679 L 454.3223570190641 284.8388214904679 L 455.209705372617 426.81455805892546 L 455.209705372617 426.81455805892546 Q 454.3223570190641 430.3639514731369 454.3223570190641 433.91334488734833 L 454.3223570190641 448.11091854419413 L 454.3223570190641 448.11091854419413 Q 454.3223570190641 463.19584055459273 443.6741767764298 472.95667244367417 Q 433.91334488734833 483.6048526863085 418.82842287694973 483.6048526863085 L 404.630849220104 483.6048526863085 L 404.630849220104 483.6048526863085 Q 402.8561525129983 483.6048526863085 401.9688041594454 483.6048526863085 Q 400.19410745233967 483.6048526863085 398.41941074523396 483.6048526863085 L 369.1369150779896 483.6048526863085 L 347.840554592721 483.6048526863085 Q 332.75563258232233 483.6048526863085 322.9948006932409 472.95667244367417 Q 312.34662045060657 463.19584055459273 312.34662045060657 448.11091854419413 L 312.34662045060657 426.81455805892546 L 312.34662045060657 426.81455805892546 L 312.34662045060657 370.02426343154247 L 312.34662045060657 370.02426343154247 Q 312.34662045060657 357.6013864818024 304.36048526863084 349.6152512998267 Q 296.3743500866551 341.62911611785097 283.95147313691507 341.62911611785097 L 227.16117850953205 341.62911611785097 L 227.16117850953205 341.62911611785097 Q 214.73830155979203 341.62911611785097 206.75216637781628 349.6152512998267 Q 198.76603119584055 357.6013864818024 198.76603119584055 370.02426343154247 L 198.76603119584055 426.81455805892546 L 198.76603119584055 426.81455805892546 L 198.76603119584055 448.11091854419413 L 198.76603119584055 448.11091854419413 Q 198.76603119584055 463.19584055459273 188.11785095320624 472.95667244367417 Q 178.35701906412478 483.6048526863085 163.27209705372616 483.6048526863085 L 141.97573656845753 483.6048526863085 L 113.58058925476602 483.6048526863085 Q 112.69324090121317 483.6048526863085 111.8058925476603 483.6048526863085 Q 110.91854419410745 483.6048526863085 110.03119584055459 483.6048526863085 Q 108.25649913344887 483.6048526863085 106.48180242634315 483.6048526863085 L 92.2842287694974 483.6048526863085 L 92.2842287694974 483.6048526863085 Q 77.19930675909879 483.6048526863085 67.43847487001733 472.95667244367417 Q 56.79029462738301 463.19584055459273 56.79029462738301 448.11091854419413 L 56.79029462738301 348.72790294627384 L 56.79029462738301 348.72790294627384 Q 56.79029462738301 347.840554592721 56.79029462738301 346.06585788561523 L 56.79029462738301 284.8388214904679 L 56.79029462738301 284.8388214904679 L 28.395147313691506 284.8388214904679 L 28.395147313691506 284.8388214904679 Q 15.972270363951473 283.95147313691507 7.986135181975737 275.96533795493934 Q 0 267.9792027729636 0 256.4436741767764 Q 0 244.02079722703638 8.873483535528596 235.1473136915078 L 236.03466204506066 36.38128249566724 L 236.03466204506066 36.38128249566724 Q 245.79549393414212 28.395147313691506 255.55632582322357 29.28249566724437 Q 266.2045060658579 29.28249566724437 274.19064124783364 35.493934142114384 L 501.35181975736566 235.1473136915078 L 501.35181975736566 235.1473136915078 Q 512 244.02079722703638 511.11265164644715 256.4436741767764 L 511.11265164644715 256.4436741767764 Z"/></svg>`;
                // processTypst()
                uploadSvgString(svgString).then((upload) => {
                    if (upload && upload.url) {
                        console.log(`Uploaded rendered Typst to ${upload.url}`)
                        // Append image markdown to post
                        this.set("reply", `${this.reply}\n\n![svg](${upload.url})`)
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