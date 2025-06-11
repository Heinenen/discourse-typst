let wasmGlue;
let fonts;

function loadWasm(wasmModuleUrl, wasmGlueUrl, fontUrls) {
    let fontFilesPromise = loadFonts(fontUrls);
    import(wasmGlueUrl).then(glue => {
        wasmGlue = glue;
        return wasmGlue.default({ module_or_path: wasmModuleUrl })
    }).then(_wasm => {
        return fontFilesPromise
    }).then(fontFiles => {
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
        console.log("Loading Typst compiler")
        loadWasm(e.data[1], e.data[2], e.data[3]);
        return;
    }
    if (!wasmGlue || !fonts) {
        // waiting to load...
        setTimeout(() => {
            messageFunction(e);
        }, 50);
        console.log("Waiting for timeout")
    } else {
        let seq = e.data[0];
        let text = e.data[1];
        console.log("Converting Typst block")
        let converted;
        try {
            converted = wasmGlue.render_typst(text)
            postMessage([seq, converted]);
        } catch (error) {
            console.warn(error)
        }
    }
}

// web worker magic function, no definition needed
onmessage = messageFunction;
