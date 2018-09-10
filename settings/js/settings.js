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

  var gatewaySid = $("#add-sid");
  gatewaySid.on("keyup", sidFormat);
  var gatewayToken = $("#add-token");
  gatewayToken.on("keyup", tokenFormat);

  $('#newGatewayAddForm').submit(function() {
    var sid = $('#add-sid').val()
    var token = $('#add-token').val()
    var sidMatch = sid.match(/[0-9A-Fa-f]{12}/g)
    var tokenMatch = token.match(/[0-9A-Fa-f]{8}/g)
    if (!sidMatch) {
      showError(__('settings.messages.invalidSidError'), 3000);
      return false
    }
    var gatewaySid = sidMatch[0]

    if (gatewaysList.some(item => item.sid === sid)) {
      showError(__('settings.messages.sidDuplicateError'), 3000);
      return false
    }
    addGateway()
  });
  $('#donateButtonYandex').submit(function() {
    var url = 'https://money.yandex.ru/to/410013864894090/'
    HomeyObj.popup(url, { width: 500, height: 900 });
  });
}

function sidFormat(e) {
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
  var sid = $('#add-sid').val()
  var token = $('#add-token').val()
  var sidMatch = sid.match(/[0-9A-Fa-f]{12}/g)
  var tokenMatch = token.match(/[0-9A-Fa-f]{8}/g)
  if (!sidMatch) {
    showError(__('settings.messages.invalidSidError'), 3000);
    return false
  }
  var gatewaySid = sidMatch[0]

  if (gatewaysList.some(item => item.sid === sid)) {
    showError(__('settings.messages.sidDuplicateError'), 3000);
    return false
  }

  $('#add-sid').val('')
  $('#add-token').val('')
  var newDevice = {id: gatewaySid+token, sid: gatewaySid, token: token.toUpperCase()}
  gatewaysList.push(newDevice)
  gatewaysList.forEach(addGatewaysToList)

  saveGatewaysList()
  showSuccess(__('settings.messages.savingSuccess'), 1500)

}


function addGatewaysToList (gateway) {
  const listItem = createListItem(gateway);
  const sidList = document.getElementById('sid-list');

  sidList.appendChild(listItem);
}

function createListItem (gateway) {
  const sidLabel = createElement('label', { className: 'sid' }, gateway.sid);
  const sidEditInput = createElement('input', { id: 'sidInput', type: 'text', className: 'sidInput', 'onkeyup': 'sidMatch(this)' });
  const tokenLabel = createElement('label', { className: 'token' }, gateway.token);
  const tokenEditInput = createElement('input', { id: 'tokenInput', type: 'text', className: 'tokenInput', 'onkeyup': 'tokenMatch(this)', 'name': 'tokenInput' });
  const editButton = createElement('button', { id: 'add-button', className: 'edit', 'data-i18n': 'settings.list.editOnList' }, 'EDIT');
  const deleteButton = createElement('button', { id: 'add-button', className: 'remove', 'data-i18n': 'settings.list.removeFromList' }, 'REMOVE');
  const item = createElement('li', { className: `gatewayList`, 'data-id': gateway.id }, sidLabel, sidEditInput, tokenLabel, tokenEditInput, editButton, deleteButton);

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
  const gatewaySid = listItem.querySelector('.sid');
  const gatewayToken = listItem.querySelector('.token');
  const sidInput = listItem.querySelector('.sidInput');
  const tokenInput = listItem.querySelector('.tokenInput')
  const editButton = listItem.querySelector('button.edit');
  const sid = sidInput.value;
  const token = tokenInput.value
  console.log(sidInput)

  const isEditing = listItem.classList.contains('editing');

      

  if (isEditing) {
      const changes = { id: id, sid: sid, token: token };
      if ($( "#tokenInput.shake" ).hasClass( "tokenInput" ) || $( "#sidInput.shake" ).hasClass( "sidInput" )) {
        
      } else {
        editTodo(changes);
      }
      
  } else {
      sidInput.value = gatewaySid.textContent;
      tokenInput.value = gatewayToken.textContent;
      editButton.textContent = 'SAVE';

        listItem.classList.add('editing');

      
  }
}

function editTodo({ id, sid, token }) {
  const data = {
      sid: sid,
      token: token
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
  const sid = listItem.querySelector('.sid');
  const sidInput = listItem.querySelector('.sidInput');
  const token = listItem.querySelector('.token');
  const tokenInput = listItem.querySelector('.tokenInput');
  const editButton = listItem.querySelector('button.edit');

  sid.textContent = gateway.sid;
  token.textContent = gateway.token
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
    if(item.sid === val){
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
  const sidList = document.getElementById('sid-list');

  sidList.removeChild(listItem);
}

function findListItem(id) {
  const sidList = document.getElementById('sid-list');
  return sidList.querySelector(`[data-id="${id}"]`);
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
