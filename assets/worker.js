let wasmGlue;
let fonts;

function loadWasm(wasmModuleUrl, wasmGlueUrl, fontUrls) {
    let fontFilesPromise = loadFonts(fontUrls);
    import(wasmGlueUrl).then(glue => {
        wasmGlue = glue;
        return wasmGlue.default(wasmModuleUrl)
    }).then(_wasm => fontFilesPromise).then(fontFiles => {
        wasmGlue.set_fonts(fontFiles);
        fonts = true;
    })
}

function loadFonts(fontUrls) {
    const promiseList = fontUrls.map((url) => {
        return fetch(url).then(response => response.arrayBuffer())
    })
    return Promise.all(promiseList)
}

function messageFunction(e) {
    if (e.data[0] === "wasmUrl") {
        loadWasm(e.data[1], e.data[2], e.data[3]);
        console.log("loading wasm")
        return;
    }
    if (!wasmGlue || !fonts) {
        // waiting to load...
        setTimeout(() => {
            messageFunction(e);
        }, 50);
        console.log("waiting for timeout")
    } else {
        let seq = e.data[0];
        let text = e.data[1];
        console.log("converting")
        let converted = wasmGlue.render_typst(text)
        postMessage([seq, converted]);
    }
}

// web worker magic function, no definition needed
onmessage = messageFunction;
