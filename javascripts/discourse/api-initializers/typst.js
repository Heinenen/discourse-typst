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
    }
    return ('00000000' + hash.toString(16).toUpperCase()).slice(-8)
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

function findTypstBlocks(msgContent) {
    const firstLineRegex = /(?<ticks>`{3,})(typ|typst) +(r|render)(?<args> .*)?\n/;
    let remainingMessage = msgContent;
    let foundBlocks = [];
    let firstLine = firstLineRegex.exec(remainingMessage)
    while (firstLine != null) {
        let block = { position: firstLine.index }
        let ticks = firstLine.groups.ticks;
        let rest = remainingMessage.slice(firstLine.index + firstLine[0].length)
        block.code = rest.slice(0, rest.search(ticks))
        block.args = firstLine.groups.args?.trim().split(/ +/)
        foundBlocks.push(block)
        remainingMessage = rest.slice(rest.search(ticks) + ticks.length)
        firstLine = firstLineRegex.exec(remainingMessage);
    }
    return foundBlocks
}

function containsRenderedBlock(msgContent, hash) {
    const regex = /!\[svg\|source-hash-(?<hash>[0-9a-fA-F]{8})\]\(.*\)/g
    let match = msgContent.matchAll(regex)?.find((it) => it.groups.hash === hash);
    return match != undefined
}

async function processTypst(typstCode) {
    let cooked = await cookTypst(typstCode)
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
            toolbarEvent.applySurround("\n```typst r\n", "\n```\n", "typst_sample", {
                multiline: false,
            });
        },
    });

    api.composerBeforeSave(function () {
        return new Promise((resolve) => {
            let typstBlock = findTypstBlocks(this.reply)[0];
            console.log(typstBlock)
            if (typstBlock == undefined) {
                resolve();
                return;
            }
            // TODO: maybe include compiler version into the hash
            // TODO: maybe increase bits of hash function to reduce collisions
            const sourceHash = simpleHash(typstBlock.code + typstBlock.position)
            if (containsRenderedBlock(this.reply, sourceHash)) {
                console.info("typst code already compiled")
                resolve();
                return;
            }

            processTypst(typstBlock.code).then((svgStrings) => {
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
});
