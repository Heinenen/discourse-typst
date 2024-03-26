import { apiInitializer } from "discourse/lib/api";
import { Promise } from "rsvp";

let webWorker;

const webWorkerUrl = settings.theme_uploads.worker;
const wasmGlueUrl = settings.theme_uploads.wasmGlue;
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

export default apiInitializer("1.13.0", (api) => {
    // this is a hack as applySurround expects a top level
    // composer key, not possible from a theme component
    window.I18n.translations[window.I18n.locale].js.composer.typst_sample = "${ x in RR | x \"is natural\"and x < 10 }$";

    api.addComposerToolbarPopupMenuOption({
        icon: "code",
        label: themePrefix("render_typst"),
        action: (toolbarEvent) => {
            toolbarEvent.applySurround("\n```typst\n", "\n```\n", "typst_sample", {
                multiline: false,
            });
        },
    });

    if (api.decorateChatMessage) {
        api.decorateChatMessage((element) => {
            applyTypst(element, `chat_message_${element.id}`);
        });
    }

    api.decorateCookedElement(
        async (elem, helper) => {
            const id = helper ? `post_${helper.getModel().id}` : "composer";
            applyTypst(elem, id);
        },
        { id: "discourse-typst" }
    );
});
