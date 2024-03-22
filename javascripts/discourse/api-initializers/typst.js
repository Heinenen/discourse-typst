import { apiInitializer } from "discourse/lib/api";
import { later } from "@ember/runloop";
import { Promise } from "rsvp";

let wasm = undefined;

const webWorkerUrl = settings.theme_uploads_local.worker;
let webWorker;

const wasmUrl = settings.theme_uploads.wasm;

async function applyTypst(element, key = "composer") {
  let typst_blocks = element.querySelectorAll("pre[data-code-wrap=typst]");

  if (!typst_blocks.length) {
    return;
  }

  typst_blocks.forEach((block) => {
    if (block.dataset.processed) {
      return;
    }

    const spinner = document.createElement("div");
    spinner.classList.add("spinner");

    if (block.dataset.codeHeight && key !== "composer") {
      block.style.height = `${block.dataset.codeHeight}px`;
    }

    later(() => {
      if (!block.dataset.processed) {
        block.append(spinner);
      }
    }, 2000);
  });

  typst_blocks = element.querySelectorAll("pre[data-code-wrap=typst]");
  typst_blocks.forEach(async (block, index) => {
    if (block.dataset.processed) {
      return;
    }

    const code = block.querySelector("code");

    if (!code) {
      block.dataset.processed = "true";
      return;
    }

    let cooked = await cookTypst(code.innerText);

    block.dataset.processed = "true";
    block.innerHTML = stripStyle(cooked);

    if (key === "composer") {
      later(() => updateMarkdownHeight(block, index), 1000);
    }
  });
}

let messageSeq = 0;
let resolvers = {};

async function cookTypst(text) {
  let seq = messageSeq++;

  if (!webWorker) {
    webWorker = new Worker(webWorkerUrl, {type: "module"});
    webWorker.postMessage(["wasmUrl", wasmUrl]);
    webWorker.onmessage = function (e) {
      let incomingSeq = e.data[0];
      let converted = e.data[1];

      resolvers[incomingSeq](converted);
      delete resolvers[incomingSeq];
    };
  }

  let message = [seq, text];

  webWorker.postMessage([seq, text]);

  let promise = new Promise((resolve, reject) => {
    resolvers[seq] = resolve;
  });

  return promise;
}

function stripStyle(svg) {
  // return svg.replace(/<style.*<\/style>/s, "");
  return svg
}

function updateMarkdownHeight(block, index) {
  let height = parseInt(block.getBoundingClientRect().height);
  let calculatedHeight = parseInt(block.dataset.calculatedHeight);

  if (height === 0) {
    return;
  }

  if (height !== calculatedHeight) {
    block.dataset.calculatedHeight = height;
    // TODO: need to use API here
    let composer = document.getElementsByClassName("d-editor-input")[0];
    let old = composer.value;

    let split = old.split("\n");

    let n = 0;
    for (let i = 0; i < split.length; i++) {
      if (split[i].match(/```typst/)) {
        if (n === index) {
          split[i] = "```typst height=" + height;
        }
        n += 1;
      }
    }

    let joined = split.join("\n");

    if (joined !== composer.value) {
      let restorePosStart = composer.selectionStart;
      let restorePosEnd = composer.selectionEnd;

      composer.value = joined;

      if (restorePosStart) {
        composer.selectionStart = restorePosStart;
        composer.selectionEnd = restorePosEnd;
      }
    }
  }
}

export default apiInitializer("1.13.0", (api) => {
  // this is a hack as applySurround expects a top level
  // composer key, not possible from a theme
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
