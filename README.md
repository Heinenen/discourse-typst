# discourse-typst

## Usage
````
```typst render=true
${ x in RR | x "is natural"and x < 10 }$
```
````

## Installation
Because this theme component includes a relatively big `wasm` file, we first have to increase the file upload limit of our Discourse server.
Navigate to `Admin -> Settings -> Files` and set `max attachment size kb` to a sufficient size, e.g., 40MB.

**Note**: This will now also allow users to upload files up to that limit. If you do not want to allow that, you can set the limit back to its original value after finishing the installation.

You can now follow the steps [here](https://meta.discourse.org/t/install-a-theme-or-theme-component/63682), to finish the installation.

## TODOs
### Priority
- [x] admin configurable preamble
    - [x] user configurable preamble
- [x] handle very large documents: make zoomable and scrollable
- [x] handle multiple pages
- [x] font support
    - [ ] low prio: option for admin to add more, e.g. via assets
    - [ ] low prio: option for users to add more, e.g. from Google Fonts
- [ ] Typst package support

### UI
- [ ] center pages in result
- [ ] something similar to how HTML/CSS/JS is handled here: [example](https://stackoverflow.com/questions/67336788/how-to-make-svg-map-zoomable-and-scrollable)
  - [ ] compile button?
  - [ ] make result collapsible?
  - [ ] reset zoom button
  - [ ] scale documents that are too wide down to fit inside the box
- [ ] better general styling
- [ ] configurable size of viewport
    - [ ] result div could be smaller if result is small enough (would "conflict" with good zooming)

### More TODOs
- [ ] multiple files support
    - [ ] not only typst file but also bib files and csv etc.
    - [ ] make code blocks collapsible
- [ ] make links/refs clickable
    - [ ] scroll to the appropriate position
- [ ] way to handle uploaded typst files instead of code blocks
    - [ ] handle other uploaded file/assets like images
- [ ] Typst "playground" support, meaning link to prefilled Typst project
- [ ] better theme support
- [ ] add buttons to code block
    - [ ] render button
    - [ ] download as PDF/PNG/SVG/ZIP button
    - [ ] download code button
    - [ ] print pdf button
    - [ ] "try it out yourself" button that redirects to playground-ish site
        - [ ] this redirects to playground with all project files included
- [ ] specify typst version (comes at cost of very big theme component)
- [ ] multiple output formats
    - [ ] optionally with multiple wasm file to not bloat the main one
    - [ ] way to download PDF file
- [ ] add loading animation if rendering is taking longer
- [ ] add loading animation if comiler takes longer to download
- [ ] configurable code tag (instead of `typst render=true`)?

### Possible other features
- [ ] option to replace codeblock with output (like the svgbob theme component)
    - [ ] maybe with user option to show/copy the source code from context menu