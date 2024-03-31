# discourse-typst

This theme component for [Discourse](https://discourse.org/) makes it possible to render Typst code anywhere in your posts!
[Theme components](https://meta.discourse.org/t/beginners-guide-to-using-discourse-themes/91966) work entirely in the client are very easy to install.

This project is closely related to https://github.com/Heinenen/discourse-typst-wasm, which produces the WebAssembly file that is used to render the Typst code.

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


# Acknoledgements
This project is heavily inspired by  https://github.com/mattfbacon/typst-bot and works mostly the same.
The main difference is that this project is for Discourse instead of Discord.

# Warning
Because Typst is still in its early phases of development, it has frequent breaking changes.
For the Discord bot, this is not a big problem because it renders the Typst code once on a server, and changes of Typst do not change the already rendered docuements.

For us, the story is a bit different, because the document is rendered client-side upon opening a post. Thus, updates to this theme component may break the rendering of a codeblock or result in a different document.

Possible solutions would be (not yet implemented):
- Vendor all (recent?) versions of Typst and somehow save the Typst version that is used in a code block. This results in out theme component becoming very big in size.
- Create a theme component for each Typst version. This is more flexible then the approach above, but also more work. It also comes with an even bigger combined file size, if the admin wants to use all of them.
- Change to server-side rendering. This will require the use of a plugin instead of a theme component. That means that it wouldn't be as easily installable for server admins.
- not sure if possible: When composing a message, insert the (client-side) rendered document into the message, in form of html/svg/pdf/whatever. This feels like the best approach I came up with.

## TODOs
### Priority
- [x] admin configurable preamble
    - [x] user configurable preamble
- [x] handle very large documents: make zoomable and scrollable
- [x] handle multiple pages
- [x] font support
    - [ ] low prio: option for admin to add more, e.g. via assets
    - [ ] low prio: option for users to add more, e.g. from Google Fonts
- [x] support `#datetime.today()`
- [x] Typst package support

### UI
- [ ] center pages in result (isn't that straightforward because of zooming)
- [ ] something similar to how HTML/CSS/JS is handled here: [example](https://stackoverflow.com/questions/67336788/how-to-make-svg-map-zoomable-and-scrollable)
  - [ ] compile button?
  - [ ] make result collapsible?
  - [ ] reset zoom button
  - [ ] scale documents that are too wide down to fit inside the box
- [ ] compiler error messages
- [ ] better general styling
- [ ] configurable size of viewport
    - [ ] result div could be smaller if result is small enough (would "conflict" with good zooming)

### More TODOs
- [ ] multiple files support
    - [ ] not only typst file but also bib files and csv etc.
    - [ ] make code blocks collapsible
- [ ] make `datetime.today()` remember the time of posting (or of last edit?)
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
    - [ ] remember version at time of posting, to have archivable results
    - [ ] warning for user, if the compiled code is not from the latest version
- [ ] multiple output formats
    - [ ] optionally with multiple wasm file to not bloat the main one
    - [ ] way to download PDF file
- [ ] cache dowloaded packages in browser
- [ ] add loading animation if rendering is taking longer
- [ ] add loading animation if comiler takes longer to download
- [ ] configurable code tag (instead of `typst render=true`)?

### Possible other features
- [ ] option to replace codeblock with output (like the svgbob theme component)
    - [ ] maybe with user option to show/copy the source code from context menu