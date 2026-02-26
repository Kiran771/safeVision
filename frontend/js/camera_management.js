window.addEventListener("DOMContentLoaded", () => {

  console.log("Script running - DOMContentLoaded fired");
  const addButton = document.getElementById('open-form')
  const overlay = document.getElementById('camera-modal-overlay')
  const closeButton = document.getElementById('close-btn')
  const submitBtn = document.getElementById('submit-camera')

  const locationSelect = document.getElementById('cam-location')
  const adminSelect = document.getElementById('cam-assigned')
  const statusSelect = document.getElementById('cam-status')


  function resetForm() {
    locationSelect.selectedIndex = 0
    adminSelect.selectedIndex = 0
    statusSelect.value = 'Active'

  }

  addButton.addEventListener('click', async () => {
    overlay.classList.add('open');
    resetForm();
    await loadLocation();
    await loadAdmin();
  });

  closeButton.addEventListener('click', () => {
    overlay.classList.remove('open');
  });

  async function loadLocation() {

    try {
      const res = await fetch('/cameras/locations')
      const data = await res.json();
      console.log("Locations fetched", data);

      locationSelect.innerHTML =
        '<option value="" disabled selected>-- Select Location --</option>';

      if (data.length === 0) {
        const opt = document.createElement('option')
        opt.textContent = 'No location available'
        opt.disabled = true;
        locationSelect.appendChild(opt);
      }

      data.forEach(loc => {
        const opt = document.createElement('option');
        opt.value = loc.location_id;
        opt.textContent = loc.name;
        locationSelect.appendChild(opt);
        return;
      });
    }
    catch (err) {
      console.error("Location load error:", err);
    }
  }
  async function loadAdmin() {
    try {
      const res = await fetch('/cameras/admins/unassigned-admins')
      const data = await res.json();
      console.log('admins',data)
      adminSelect.innerHTML =
        '<option value="" disabled selected>-- Select Admin --</option>';

      if (data.length === 0) {
        const opt = document.createElement('option')
        opt.textContent = 'No admin available'
        opt.disabled = true;
        adminSelect.appendChild(opt);
        return;
      }
      data.forEach(admin => {
      const option = document.createElement('option');
      option.value = admin.userid;
      option.textContent = admin.username;
      adminSelect.appendChild(option);
    });


    }
    catch(err){
      console.log('Error loading admin',err)   
    }

  }
});





