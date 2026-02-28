window.addEventListener("DOMContentLoaded", () => {

  console.log("Script running - DOMContentLoaded fired");
  const addButton = document.getElementById('open-form')
  const overlay = document.getElementById('camera-modal-overlay')
  const formElement = document.getElementById('cameraForm')
  const closeButton = document.getElementById('close-btn')
  const submitBtn = document.getElementById('submit-camera')
  const modalTitle = document.querySelector('.modal h2')
  const tableBody = document.getElementById('camera-table-body')

  const locationSelect = document.getElementById('cam-location')
  const adminSelect = document.getElementById('cam-assigned')
  const statusSelect = document.getElementById('cam-status')

  let editCameraId = null;



  addButton.addEventListener('click', async () => {
    editCameraId = null;
    modalTitle.textContent = 'Register New Camera'
    submitBtn.textContent = 'Register';
    resetForm();
    
    await loadLocation();
    await loadAdmin();

    overlay.classList.add('open');
  });

  closeButton.addEventListener('click', () => {
    overlay.classList.remove('open');
  });

  function resetForm() {
    locationSelect.selectedIndex = 0
    adminSelect.selectedIndex = 0
    statusSelect.value = 'Active'

  }
  // load Dropdown
  async function loadLocation(selectedValue = null) {

    try {
      const res = await fetch('/cameras/locations')
      const data = await res.json();
      console.log("Locations fetched", data);

      locationSelect.innerHTML =
        '<option value="" disabled selected>-- Select Location --</option>';

      data.forEach(loc => {
        const opt = document.createElement('option');
        opt.value = loc.location_id;
        opt.textContent = loc.name;
        if (selectedValue && loc.location_id == selectedValue) opt.selected = true
        locationSelect.appendChild(opt);
        return;
      });
    }
    catch (err) {
      console.error("Location load error:", err);
    }
  }
  async function loadAdmin(selectedValue = null, allAdmins = false) {
    try {
      const url = allAdmins ? '/cameras/admins/all': '/cameras/admins/unassigned-admins';
      const res = await fetch(url)
      const data = await res.json();
      console.log('admins', data)
      adminSelect.innerHTML =
        '<option value="" disabled selected>-- Select Admin --</option>';

      data.forEach(admin => {
        console.log(`admin.userid=${admin.userid} selectedValue=${selectedValue} match=${admin.userid == selectedValue}`);
        const option = document.createElement('option');
        option.value = admin.userid;
        option.textContent = admin.username;
        if (selectedValue && admin.userid == selectedValue) option.selected = true
        adminSelect.appendChild(option);
      });

    }
    catch (err) {
      console.log('Error loading admin', err)
    }

  }
  async function loadAvailableAdmins(selectedValue = null, cameraId = null) {
  try {
    const url = cameraId 
      ? `/cameras/admins/available/${cameraId}` 
      : '/cameras/admins/unassigned-admins';
    
    const res  = await fetch(url);
    const data = await res.json();
    
    adminSelect.innerHTML = '<option value="" disabled selected>-- Select Admin --</option>';
    data.forEach(admin => {
      const option       = document.createElement('option');
      option.value       = admin.userid;
      option.textContent = admin.username;
      if (selectedValue && admin.userid == selectedValue) option.selected = true;
      adminSelect.appendChild(option);
    });
  } catch (err) {
    console.error('Error loading admins', err);
  }
}

  async function loadCameras() {
    try {
      const res = await fetch('/cameras/');
      const data = await res.json();

      const tableBody = document.getElementById('camera-table-body');
      tableBody.innerHTML = '';

      if (data.length === 0) {
        tableBody.innerHTML =
          '<tr class="empty-row"><td colspan="5">No camera found</td></tr>';
        return;
      }

      data.forEach(cam => {
        const row = document.createElement('tr');
        row.innerHTML = `
        <td>${cam.cameraid}</td>
        <td>${cam.location}</td>
        <td>${cam.assigned_to}</td>
        <td>${cam.status}</td>
        <td>
          <button class="btn-edit" data-id="${cam.cameraid}" data-location="${cam.location_id}"data-admin="${cam.admin_id}"
        data-status="${cam.status}"><img src="/resources/edit.png" alt="Edit"></button>
          <button class="btn-delete" data-id="${cam.cameraid}"><img src="/resources/delete.png" alt="Delete"></button>
      </td>`;
        tableBody.appendChild(row);
      });

      document.getElementById('total-count').textContent = data.length;

    } catch (err) {
      console.error("Camera load error", err);
    }
  }
  tableBody.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('.btn-edit');
    const deleteBtn = e.target.closest('.btn-delete');

    // EDIT 
    if (editBtn) {
      editCameraId = editBtn.dataset.id;
      console.log('dataset:', editBtn.dataset);        
      console.log('admin id:', editBtn.dataset.admin); 
      modalTitle.textContent = `Edit Camera #${editCameraId}`;
      submitBtn.textContent = 'Update';

      await loadLocation(editBtn.dataset.location);
      await loadAvailableAdmins(editBtn.dataset.admin, editCameraId);
      statusSelect.value = editBtn.dataset.status;

      overlay.classList.add('open');
    }

    // DELETE
    if (deleteBtn) {
      const cameraId = deleteBtn.dataset.id;
      const confirmed = confirm(`Do you want to remove camera with CameraId${cameraId}?`);
      if (!confirmed) return;

      try {
        const res = await fetch(`/cameras/delete/${cameraId}`, { method: 'DELETE' });
        const result = await res.json();
        alert(result.message);
        loadCameras();
      } catch (err) {
        console.error("Delete error", err);
      }
    }
  });

  // form submit
  formElement.addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = {
      location_id: parseInt(locationSelect.value),
      admin_id: parseInt(adminSelect.value),
      status: statusSelect.value
    };
    const url  = editCameraId ? `/cameras/update/${editCameraId}` : '/cameras/register'; 
    const method = editCameraId ? 'PUT': 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await res.json();
      alert(result.message);
      loadCameras();
      overlay.classList.remove('open');

    } catch (err) {
      console.error("Register error", err);
    }
  });
  loadCameras()
});








