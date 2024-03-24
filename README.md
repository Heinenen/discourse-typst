# discourse-typst

````
```render-typst
${ x in RR | x "is natural"and x < 10 }$
```
````

# TODO
- [x] admin configurable preamble
    - [x] user configurable preamble
- [x] don't replace code block when rendering
    - [ ] nicer styling
    - [ ] something similar to how HTML/CSS/JS is handled here: [example](https://stackoverflow.com/questions/67336788/how-to-make-svg-map-zoomable-and-scrollable)
    - [ ] handle very large documents: make zoomable and scrollable
    - [ ] configurable
        - [ ] maybe with user option to show/copy the source code from context menu
- [ ] configurable code tag (instead of `typst render=true`)
- [ ] configurable size of viewport
    - [ ] maybe with a collapsible part
    - [ ] maybe with a scroll wheel
- [ ] handle multiple pages
- [ ] way to handle uploaded typst files instead of code blocks
    - [ ] handle other uploaded file/assets like images
- [ ] more fonts, best to have same fonts for all users
    - [ ] option for admin to add more?
- [ ] Typst package support
- [ ] Typst "playground" support, meaning link to prefilled Typst project
- [ ] multiple files support
    - [ ] not only typst file but also bib files and csv etc.
- [ ] better theme support
- [ ] add buttons to code block
    - [ ] render button
    - [ ] download as PDF/PNG/SVG/ZIP button
    - [ ] download code button
    - [ ] print pdf button
    - [ ] "try it out yourself" button that redirects to playground-ish site
        - [ ] this redirects to playground with all project files included
- [ ] specify typst version
- [ ] multiple output formats
    - [ ] optionally with multiple wasm file to not bloat the main one
    - [ ] way to download PDF file
- [ ] add loading animation if rendering is taking longer
- [ ] add loading animation if comiler takes longer to download