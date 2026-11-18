const API_BASE_URL = "http://18.206.218.128:5000";


async function checkBackendHealth() {
  const badge = document.getElementById("health-badge");

  try {
    const response = await fetch(`${API_BASE_URL}/health`);

    if (response.ok) {
      badge.textContent = "ONLINE";
      badge.className = "badge-online"; 
    } else {
      throw new Error(`Servidor respondió con estado HTTP ${response.status}`);
    }
  } catch (error) {
    badge.textContent = "OFFLINE (Revisar SG / UFW / CORS)";
    badge.className = "badge-offline"; 
    console.error("Error contactando al Backend en EC2:", error);
  }
}

async function fetchPatients() {
  try {
    const response = await fetch(`${API_BASE_URL}/patients`);

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const patientsData = await response.json();

    renderPatients(patientsData);
  } catch (error) {
    console.error("Error al obtener pacientes (¿Fallo de red o bloqueo CORS?):", error);
  }
}


async function createPatientRecord(patientPayload) {
  try {
    const response = await fetch(`${API_BASE_URL}/patients`, {
      method: "POST", 
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(patientPayload)
    });

    if (!response.ok) {
      throw new Error(`No se pudo registrar el paciente. HTTP ${response.status}`);
    }
  } catch (error) {
    console.error("Error al crear paciente:", error);
    alert("Hubo un error al registrar al paciente. Revisa la consola del navegador (F12).");
  }
}


async function deletePatientRecord(patientId) {
  try {
    const response = await fetch(`${API_BASE_URL}/patients/${patientId}`, {
      method: "DELETE" 
    });

    if (!response.ok) {
      throw new Error(`No se pudo dar de alta al paciente. HTTP ${response.status}`);
    }
  } catch (error) {
    console.error("Error al eliminar paciente:", error);
    alert("No se pudo eliminar el registro. Revisa la conexión con el servidor EC2.");
  }
}

function renderPatients(patientsList) {
  const tbody = document.getElementById("patients-tbody");
  tbody.innerHTML = "";
  if (!patientsList || patientsList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No hay pacientes en sala de espera.</td></tr>`;
    return;
  }


  patientsList.forEach((p) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>#${p.id}</td>
      <td><strong>${escapeHtml(p.name)}</strong></td>
      <td>${escapeHtml(p.symptom)}</td>
      <td><span class="urgency-tag urgency-${p.urgency}">${p.urgency}</span></td>
      <td>
        <button class="btn-discharge" onclick="handleDischarge(${p.id})">
          Dar de Alta
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

document.getElementById("triage-form").addEventListener("submit", async (e) => {
  e.preventDefault(); 

  const payload = {
    name: document.getElementById("patient-name").value.trim(),
    symptom: document.getElementById("symptom").value.trim(),
    urgency: document.getElementById("urgency").value,
  };

  await createPatientRecord(payload); 
  e.target.reset();               
  await fetchPatients();              
});

async function handleDischarge(id) {
  await deletePatientRecord(id); 
  await fetchPatients();         
}

document.getElementById("refresh-btn").addEventListener("click", fetchPatients);

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[m]));
}

window.addEventListener("DOMContentLoaded", () => {
  checkBackendHealth();
  fetchPatients();
});