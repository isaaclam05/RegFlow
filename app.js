// Screen Switching Function
function switchScreen(screenId) {
  document.querySelectorAll('.view').forEach(view => {
    view.classList.remove('active');
  });
  document.getElementById(screenId).classList.add('active');
}

// Simulated Decision & Audit Trail Generation
function makeDecision(decision) {
  const notes = document.getElementById('justification').value.trim();
  const statusMsg = document.getElementById('audit-status');

  if (!notes) {
    alert("Error: You must provide justification notes for the MAS audit trail before submitting.");
    return;
  }

  statusMsg.innerHTML = `<strong>Status:</strong> Case successfully <em>${decision}</em>. <br><small>Time-stamped audit log saved to MAS Compliance Ledger at ${new Date().toLocaleTimeString()}.</small>`;
  statusMsg.style.color = "green";
}