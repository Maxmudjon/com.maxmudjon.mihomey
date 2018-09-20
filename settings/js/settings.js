var gatewaysList = []
var HomeyObj

function onHomeyReady (Homey) {
  HomeyObj = Homey
  initSettings()
  HomeyObj.ready()
}

function initSettings () {
  clearBusy()
  clearError()
  clearSuccess()
  loadSettings()

  var gatewayMac = $("#add-mac");
  gatewayMac.on("keyup", macFormat);
  var gatewayPassword = $("#add-password");
  gatewayPassword.on("keyup", tokenFormat);

  $('#newGatewayAddForm').submit(function() {
    var mac = $('#add-mac').val()
    var password = $('#add-password').val()
    var macMatch = mac.match(/[0-9A-Fa-f]{12}/g)
    var tokenMatch = password.match(/[0-9A-Fa-f]{8}/g)
    if (!macMatch) {
      showError(__('settings.messages.invalidMacError'), 3000);
      return false
    }
    var gatewayMac = macMatch[0]

    if (gatewaysList.some(item => item.mac === mac)) {
      showError(__('settings.messages.macDuplicateError'), 3000);
      return false
    }
    addGateway()
  });
  $('#donateButtonYandex').submit(function() {
    var url = 'https://money.yandex.ru/to/410013864894090/'
    HomeyObj.popup(url, { width: 500, height: 900 });
  });
}

function macFormat(e) {
  var r = /[0-9A-Fa-f]{6}/g,
    str = e.target.value.replace(/[^a-f0-9]/ig, "");
  e.target.value = str.slice(0, 12);
};

function tokenFormat(e) {
  var r = /[0-9A-Fa-f]{8}/g,
    str = e.target.value.replace(/[^a-f0-9]/ig, "");
  e.target.value = str.slice(0, 16);
};

function addGateway () {
  var mac = $('#add-mac').val()
  var password = $('#add-password').val()
  var macMatch = mac.match(/[0-9A-Fa-f]{12}/g)
  var tokenMatch = password.match(/[0-9A-Fa-f]{8}/g)
  if (!macMatch) {
    showError(__('settings.messages.invalidMacError'), 3000);
    return false
  }
  var gatewayMac = macMatch[0]

  if (gatewaysList.some(item => item.mac === mac)) {
    showError(__('settings.messages.macDuplicateError'), 3000);
    return false
  }

  $('#add-mac').val('')
  $('#add-password').val('')
  var newDevice = {id: gatewayMac+password, mac: gatewayMac, password: password.toUpperCase()}
  gatewaysList.push(newDevice)
  gatewaysList.forEach(addGatewaysToList)

  saveGatewaysList()
  showSuccess(__('settings.messages.savingSuccess'), 1500)

}


function addGatewaysToList (gateway) {
  const listItem = createListItem(gateway);
  const macList = document.getElementById('mac-list');

  macList.appendChild(listItem);
}

function createListItem (gateway) {
  const macLabel = createElement('label', { className: 'mac' }, gateway.mac);
  const macEditInput = createElement('input', { id: 'macInput', type: 'text', className: 'macInput', 'onkeyup': 'macMatch(this)' });
  const tokenLabel = createElement('label', { className: 'password' }, gateway.password);
  const tokenEditInput = createElement('input', { id: 'passwordInput', type: 'text', className: 'passwordInput', 'onkeyup': 'tokenMatch(this)', 'name': 'passwordInput' });
  const editButton = createElement('button', { id: 'add-button', className: 'edit', 'data-i18n': 'settings.list.editOnList' }, 'EDIT');
  const deleteButton = createElement('button', { id: 'add-button', className: 'remove', 'data-i18n': 'settings.list.removeFromList' }, 'REMOVE');
  const item = createElement('li', { className: `gatewayList`, 'data-id': gateway.id }, macLabel, macEditInput, tokenLabel, tokenEditInput, editButton, deleteButton);

  return addEventListeners(item);
}

function createElement(tag, props, ...children) {
    const element = document.createElement(tag);

    Object.keys(props).forEach(key => {
        if (key.startsWith('data-')) {
            element.setAttribute(key, props[key]);
        } else if (key.startsWith('id')) {
            element.setAttribute(key, props[key]);
        } else if (key.startsWith('onkeyup')) {
            element.setAttribute(key, props[key]);
        } else if (key.startsWith('name')) {
            element.setAttribute(key, props[key]);
        } else {
            element[key] = props[key];
        }
    });

    children.forEach(child => {
        if (typeof child === 'string') {
            child = document.createTextNode(child);
        }

        element.appendChild(child);
    });

    return element;
}

function addEventListeners(item) {
  const editButton = item.querySelector('button.edit');
  const removeButton = item.querySelector('button.remove');

  editButton.addEventListener('click', handleEdit);
  removeButton.addEventListener('click', handleRemove);

  return item;
}

function handleEdit({ target }) {
  const listItem = target.parentNode;
  const id = listItem.getAttribute('data-id');
  const gatewayMac = listItem.querySelector('.mac');
  const gatewayPassword = listItem.querySelector('.password');
  const macInput = listItem.querySelector('.macInput');
  const passwordInput = listItem.querySelector('.passwordInput')
  const editButton = listItem.querySelector('button.edit');
  const mac = macInput.value;
  const password = passwordInput.value
  console.log(macInput)

  const isEditing = listItem.classList.contains('editing');

      

  if (isEditing) {
      const changes = { id: id, mac: mac, password: password };
      if ($( "#passwordInput.shake" ).hasClass( "passwordInput" ) || $( "#macInput.shake" ).hasClass( "macInput" )) {
        
      } else {
        editTodo(changes);
      }
      
  } else {
      macInput.value = gatewayMac.textContent;
      passwordInput.value = gatewayPassword.textContent;
      editButton.textContent = 'SAVE';

        listItem.classList.add('editing');

      
  }
}

function editTodo({ id, mac, password }) {
  const data = {
      mac: mac,
      password: password
  }
  const item = updateItem(id, data);
  editItem(item);
}

function updateItem(id, data) {
  const item = getItem(id);

  Object.keys(data).forEach(prop => item[prop] = data[prop]);
  saveGatewaysList()

  return item;
}

function getItem(id) {
  return gatewaysList.find(item => item.id == id);
}

function editItem(gateway) {
  const listItem = findListItem(gateway.id);
  const mac = listItem.querySelector('.mac');
  const macInput = listItem.querySelector('.macInput');
  const password = listItem.querySelector('.password');
  const passwordInput = listItem.querySelector('.passwordInput');
  const editButton = listItem.querySelector('button.edit');

  mac.textContent = gateway.mac;
  password.textContent = gateway.password
  editButton.textContent = 'EDIT';
  listItem.classList.remove('editing');
}

function handleRemove({ target }) {
  const listItem = target.parentNode;

  removeItem(listItem.getAttribute('data-id'));

  var data = gatewaysList;
  var index = -1;
  var val = target
  var filteredObj = data.find(function(item, i){
    if(item.mac === val){
      index = i;
      return i;
    }
  });

  $(`[data-ip="${target}"]`).remove()
  gatewaysList.splice(index, 1)

  saveGatewaysList()
}

function removeItem(id) {
  const listItem = findListItem(id);
  const macList = document.getElementById('mac-list');

  macList.removeChild(listItem);
}

function findListItem(id) {
  const macList = document.getElementById('mac-list');
  return macList.querySelector(`[data-id="${id}"]`);
}


function loadSettings () {
  HomeyObj.get('gatewaysList', function (error, currentGatewaysList) {
    if (error) return console.error(error)
    gatewaysList = currentGatewaysList || []
    gatewaysList.forEach(addGatewaysToList)
  })
}

function saveGatewaysList () {
  HomeyObj.set('gatewaysList', gatewaysList, function (error, settings) {
    if (error) { return showError(__('settings.messages.savingError')) }
    showSuccess(__('settings.messages.savingSuccess'), 3000)
  })
}

function clearBusy () { $('#busy').hide() }
function showBusy (message, showTime) {
  clearError()
  clearSuccess()
  var element = document.getElementById("header");
  element.style.backgroundColor = "#f2ff00aa";
  var title = document.getElementsByClassName("h1")
  const oldTitle = title[0].innerHTML
  title[0].innerHTML = message;
  setTimeout(function(){
    element.style.backgroundColor = "#d5e4ff";
    title[0].innerHTML = oldTitle;
  }, showTime);
}

function clearError () { $('#error').hide() }
function showError (message, showTime) {
  clearBusy()
  clearSuccess()
  var element = document.getElementById("header");
  element.style.backgroundColor = "#ff0000aa";
  var title = document.getElementsByClassName("h1")
  const oldTitle = title[0].innerHTML
  title[0].innerHTML = message;
  setTimeout(function(){
    element.style.backgroundColor = "#d5e4ff";
    title[0].innerHTML = oldTitle;
  }, showTime);
}

function clearSuccess () { $('#success').hide() }
function showSuccess (message, showTime) {
  clearBusy()
  clearError()
  var element = document.getElementById("header");
  element.style.backgroundColor = "#00ff00aa";
  var title = document.getElementsByClassName("h1")
  const oldTitle = title[0].innerHTML
  title[0].innerHTML = message;
  setTimeout(function(){
    element.style.backgroundColor = "#d5e4ff";
    title[0].innerHTML = oldTitle;
  }, showTime);
}
