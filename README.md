# ModalEngine.js
A web component modal that uses JSON config to procedurally update itself. <br>

## Features:
* Draggable window
* Easy setup of multiple modals
* Easy setup of mulitple pages per modal
* Easy to implement into existing codebase
* Small footprint: <7Kb
* Optional callback on success

## What it looks like:

<p align="center">
  <img src="https://raw.githubusercontent.com/BraveOPotato/ProceduralModal/refs/heads/main/images/modal.png" alt="Screenshot"/>
</p>

## How to use: (deprecated. Better documentation at: [docs](https://braveopotato.github.io/ModalEngine/))
1. Add link to the web component in the HTML like so:
```html
<script src="https://raw.githubusercontent.com/BraveOPotato/ModalEngine/refs/heads/main/docs/modalengine.min.js"></script>
```
2. Then, in the JavaScript, you can simply define the modals and their configs. The following is an example modal:

```js
modalEngine = new RuntimeModal();

modalEngine.registerModals([
  {
    modalName: "add-link",
    title: "Add Link",
    submitUrl: "/api.php",
    method: "POST",
    pages: [
      {
        title: "Basic Information",
        fields: [
          { type: "text", label: "Display name", name: "link_name", placeholder: "e.g. Nagios" },
          { type: "url", label: "URL", name: "link_url", placeholder: "https://", value: "https://", tooltip:"Preceed the URL with 'http://' or 'https://'"},
          { type: "textarea", label: "Description", name: "link_description", placeholder: "For monitoring..."},
        ]
      }
    ],
    callbackFn: refreshLinks
  }
]);
```

3. Finally, add an `onclick` attribute to an HTML element to show the modal in the `onclick` event:
```html
<button onclick="modalEngine.openModal('add-link')">New</button>
```

## Usage:
THere are two methods that the `RuntimeModal` class provides:
* `void registerModals([modalObj1, ...])`
Before you can use the `void openModal(String modalName)` method, at least one modal needs to be registered. As of right now, it isnt' possible to alter a modal after it has been registered, but the user can always add another modal with different parameters and a different name.<br>
***NOTE***: In the future, either this or another API will be added to alter existing modals at runtime.
  <br>

* `void openModal(String modalName)`
Once a modal has been registered with the `void registerModals([modalObj1, ...])`, it will be possible to open it using this method, and the modal object's `modalName` key. 
