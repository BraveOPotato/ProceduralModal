# ProceduralModal
A web component modal that uses JSON config to procedurally update itself. 

## How to use:
Add link to the web component in the HTML like so:
```html
<script src="https://raw.githubusercontent.com/BraveOPotato/ProceduralModal/refs/heads/main/modal-comp.js"></script>
```
Then, in the JavaScript, you can simply define the modals and their configs:

```js
customModal = new RuntimeModal();

customModal.registerModals([
  {
    modalName: "add-link",
    title: "Add Link",
    submitUrl: "api.php",
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

Finally, add an `onclick` attribute to an HTML element to show the modal in the `onclick` event:
```html
<button onclick="customModal.openModal('add-link')">New</button>
```
