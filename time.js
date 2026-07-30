    const AppState = {
      currentStep: 1,
      consent: false,
      biometricScore: 0,
      facePassed: false,
      singpassRetrieved: false,
      acraVerified: false,
      bizProfileMode: 'acra',
      bizProfileFetched: false,
      documentsUploaded: { doc1: false, doc2: false, doc3: false },
      documentBlobs: { doc1: null, doc2: null, doc3: null },
      documentNames: { doc1: '', doc2: '', doc3: '' },
      riskFactors: { industry: 10, pep: 0 },
      amlCleared: false,
      calculatedScore: 0
    };

    const inputIds = [
      'inpUen', 'inpCompany', 'incDate', 'selCountry', 'selSsic', 'inpCapital', 'inpWebsite', 'inpAddress',
      'inpName', 'inpId', 'selNationality', 'selPep', 'inpResAddress',
      'selSow', 'selTurnover', 'inpMaxTx', 'inpRemittance',
      'selFatca', 'inpTin'
    ];

    /* INITIALIZE APP ON LOAD */
    window.addEventListener('DOMContentLoaded', () => {
      initLocalStorageListeners();
      loadFromLocalStorage();
    });

    /* CLEAR EVERYTHING FUNCTION */
    function clearEverything() {
      localStorage.clear();
      sessionStorage.clear();
      showToast('All onboarding data & saved state cleared.', 'info');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }

    /* LOCAL STORAGE STATE MANAGEMENT */
    function initLocalStorageListeners() {
      inputIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.addEventListener('input', () => saveToLocalStorage());
          el.addEventListener('change', () => saveToLocalStorage());
        }
      });

      const chk = document.getElementById('chkConsent');
      if (chk) {
        chk.addEventListener('change', () => {
          AppState.consent = chk.checked;
          saveToLocalStorage();
        });
      }
    }

    function saveToLocalStorage() {
      const data = {
        AppState: { ...AppState, documentBlobs: {} }, // Exclude raw file blobs from storage
        inputs: {}
      };

      inputIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) data.inputs[id] = el.value;
      });

      const uboData = [];
      document.querySelectorAll('.ubo-item').forEach(item => {
        uboData.push({
          name: item.querySelector('.ubo-name')?.value || '',
          shares: item.querySelector('.ubo-shares')?.value || '',
          taxRes: item.querySelector('.ubo-tax-res')?.value || '',
          pep: item.querySelector('.ubo-pep')?.value || ''
        });
      });
      data.ubos = uboData;

      localStorage.setItem('regflow_state', JSON.stringify(data));
    }

    function loadFromLocalStorage() {
      const raw = localStorage.getItem('regflow_state');
      if (!raw) return;

      try {
        const data = JSON.parse(raw);
        if (data.AppState) {
          Object.assign(AppState, data.AppState);
        }

        if (data.inputs) {
          Object.keys(data.inputs).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = data.inputs[id];
          });
        }

        if (data.ubos && data.ubos.length > 0) {
          const container = document.getElementById('ubo-container');
          if (container) {
            container.innerHTML = '';
            data.ubos.forEach((u, idx) => {
              addUboFieldWithData(idx + 1, u);
            });
          }
        }

        if (AppState.consent) {
          document.getElementById('chkConsent').checked = true;
          updateTelemetry('sig-consent', 'PASS', 'pass');
        }

        if (AppState.acraVerified) {
          updateTelemetry('sig-acra', 'VERIFIED', 'pass');
          document.getElementById('acraResultCard').style.display = 'block';

          // Parse current time or existing stored timestamp into SGT format
          const rawTimestamp = AppState.acraTimestamp || new Date();
          const sgtFormatted = new Date(rawTimestamp).toLocaleString('en-SG', {
            timeZone: 'Asia/Singapore',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          });

          document.getElementById('acraResultTimestamp').innerText = `FETCHED: ${sgtFormatted} (SGT)`;
          document.getElementById('res-company').innerText = document.getElementById('inpCompany').value || '-';
          document.getElementById('res-country').innerText = document.getElementById('selCountry').value || '-';
          document.getElementById('res-incdate').innerText = document.getElementById('incDate').value || '-';
          document.getElementById('res-capital').innerText = document.getElementById('inpCapital').value ? `SGD $${Number(document.getElementById('inpCapital').value).toLocaleString()}` : '-';
          document.getElementById('res-ssic').innerText = document.getElementById('selSsic').value || '-';
          document.getElementById('res-website').innerText = document.getElementById('inpWebsite').value || '-';
          document.getElementById('res-address').innerText = document.getElementById('inpAddress').value || '-';
        }

        if (AppState.singpassRetrieved) {
          updateTelemetry('sig-bio', 'PASS (98%)', 'pass');
          document.getElementById('singpassBoxContainer').style.display = 'none';
          document.getElementById('inpName').disabled = false;
          document.getElementById('inpId').disabled = false;
          document.getElementById('selNationality').disabled = false;
          document.getElementById('inpResAddress').disabled = false;
        }

        if (AppState.documentsUploaded) {
          Object.keys(AppState.documentsUploaded).forEach(docKey => {
            if (AppState.documentsUploaded[docKey]) {
              const badge = document.getElementById(`badge-wiz${docKey.replace('doc', '')}`);
              if (badge) {
                badge.innerText = 'VERIFIED';
                badge.className = 'doc-wizard-badge badge-verified';
              }
            }
          });
        }

        if (AppState.currentStep > 1) {
          navigate(AppState.currentStep, true);
        }
      } catch (e) {
        console.error("Failed to load state from LocalStorage:", e);
      }
    }

    /* TELEMETRY HELPERS */
    function updateTelemetry(id, text, type) {
      const el = document.getElementById(id);
      if (el) {
        el.innerText = text;
        el.className = `telemetry-val ${type}`;
      }
    }

    function showToast(message, type = 'info') {
      const container = document.getElementById('toastContainer');
      if (!container) return;
      const toast = document.createElement('div');
      toast.className = `toast ${type === 'error' ? 'toast-error' : ''}`;
      toast.innerHTML = `<span>${type === 'error' ? '⚠️' : 'ℹ️'}</span> <span>${message}</span>`;
      container.appendChild(toast);
      setTimeout(() => toast.remove(), 4000);
    }

    /* NAVIGATION LOGIC */
    function navigate(stepNum, skipValidation = false) {
      if (stepNum < 1 || stepNum > 8) return;

      const currentPanel = document.getElementById(`panel-${AppState.currentStep}`);
      const targetPanel = document.getElementById(`panel-${stepNum}`);

      if (currentPanel) currentPanel.classList.remove('active');
      if (targetPanel) targetPanel.classList.add('active');

      AppState.currentStep = stepNum;

      // Update Top Progress Fill
      const topFill = document.getElementById('topProgressFill');
      if (topFill) topFill.style.width = `${(stepNum / 8) * 100}%`;

      // Update Sidebar Items
      document.querySelectorAll('.workflow-item').forEach(item => {
        const itemStep = parseInt(item.getAttribute('data-step'), 10);
        item.classList.remove('active');
        if (itemStep === stepNum) {
          item.classList.add('active');
        }
        if (itemStep < stepNum) {
          item.classList.add('completed');
        } else {
          item.classList.remove('completed');
        }
      });

      if (stepNum === 8) {
        renderComprehensiveSummary();
        calculateAndRenderFinalOutcome();
      }

      saveToLocalStorage();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /* STEP 1: CONSENT */
    function submitConsent() {
      const chk = document.getElementById('chkConsent');
      if (!chk || !chk.checked) {
        showToast('You must accept the terms and biometric processing consent to proceed.', 'error');
        return;
      }
      AppState.consent = true;
      updateTelemetry('sig-consent', 'PASS', 'pass');
      navigate(2);
    }

    /* STEP 2: CORPORATE DETAILS / ACRA LOOKUP */
    function runAcraQuery() {
      const uenInput = document.getElementById('inpUen');
      const uen = uenInput?.value.trim().toUpperCase();

      if (!uen) {
        uenInput.classList.add('input-error');
        showToast('Please enter a valid Singapore UEN / Entity ID.', 'error');
        return;
      }
      uenInput.classList.remove('input-error');

      const btn = document.getElementById('btnAcra');
      const consoleBox = document.getElementById('acraConsole');
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner"></span> Querying ACRA...`;
      consoleBox.style.display = 'flex';
      consoleBox.innerHTML = '';

      const logs = [
        `[ACRA-API] Initializing mTLS connection to ACRA Business Registry...`,
        `[ACRA-API] Querying UEN: ${uen}...`,
        `[ACRA-API] Entity record matched. Fetching BizFile metadata...`,
        `[ACRA-API] Verification successful. Entity active and compliant.`
      ];

      let delay = 0;
      logs.forEach((log, index) => {
        delay += 500;
        setTimeout(() => {
          const line = document.createElement('div');
          line.className = 'console-line';
          line.innerText = log;
          consoleBox.appendChild(line);
          consoleBox.scrollTop = consoleBox.scrollHeight;

          if (index === logs.length - 1) {
            btn.disabled = false;
            btn.innerHTML = `Retrieve from ACRA`;

            // Auto fill mock ACRA data
            document.getElementById('selCountry').value = 'Singapore';
            document.getElementById('inpCompany').value = 'REGFLOW AI PTE. LTD.';
            document.getElementById('incDate').value = '2023-01-15';
            document.getElementById('selSsic').value = '62014 - Development of artificial intelligence and machine learning models';
            document.getElementById('inpCapital').value = '500000';
            document.getElementById('inpWebsite').value = 'https://www.regflow.ai';
            document.getElementById('inpAddress').value = '71 AYER RAJAH CRESCENT, #02-18, SINGAPORE 139951';

            // Show Result Card
            document.getElementById('acraResultCard').style.display = 'block';
            document.getElementById('acraResultTimestamp').innerText = `FETCHED: ${new Date().toLocaleTimeString()} (GMT+8)`;
            document.getElementById('res-company').innerText = 'REGFLOW AI PTE. LTD.';
            document.getElementById('res-country').innerText = 'Singapore';
            document.getElementById('res-incdate').innerText = '2023-01-15';
            document.getElementById('res-capital').innerText = 'SGD $500,000';
            document.getElementById('res-ssic').innerText = '62014 - Artificial intelligence & machine learning development';
            document.getElementById('res-website').innerText = 'https://www.regflow.ai';
            document.getElementById('res-address').innerText = '71 AYER RAJAH CRESCENT, #02-18, SINGAPORE 139951';

            AppState.acraVerified = true;
            updateTelemetry('sig-acra', 'VERIFIED', 'pass');
            saveToLocalStorage();
            showToast('ACRA Corporate Details retrieved successfully!');
          }
        }, delay);
      });
    }

    function submitCorporateDetails() {
      const uen = document.getElementById('inpUen').value.trim();
      const company = document.getElementById('inpCompany').value.trim();

      if (!uen || !company) {
        showToast('Please perform an ACRA search or complete corporate details before proceeding.', 'error');
        return;
      }
      navigate(3);
    }

    /* STARTS SINGPASS BIOMETRIC FLOW */
    async function startSingpassFlow() {
      const bioWrapper = document.getElementById('bioWrapper');
      const btnSingpass = document.getElementById('btnSingpassTrigger');

      if (AppState.singpassRetrieved) {
        showToast('Singpass MyInfo data has already been retrieved.', 'info');
        return;
      }

      // 1. Show facial recognition camera box
      bioWrapper.style.display = 'flex';
      btnSingpass.disabled = true;

      try {
        // Attempt camera access
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const video = document.getElementById('webcam');
        video.srcObject = stream;

        runBiometricScan(stream);
      } catch (err) {
        // Fallback simulation if no camera hardware is available
        document.getElementById('bioPrompt').innerText = "Camera Access Required";
        document.getElementById('bioSubPrompt').innerText = "Simulating Singpass Liveness Check...";
        setTimeout(() => {
          completeBiometricVerification(null);
        }, 2500);
      }
    }

    /* SIMULATES BIOMETRIC SCANNING PROGRESS */
    function runBiometricScan(stream) {
      const prompt = document.getElementById('bioPrompt');
      const subPrompt = document.getElementById('bioSubPrompt');

      prompt.innerText = "Position face in center...";
      
      setTimeout(() => {
        prompt.innerText = "Hold still — Verifying Biometrics...";
      }, 1200);

      setTimeout(() => {
        completeBiometricVerification(stream);
      }, 3200);
    }

    /* LOGICAL SUCCESS STATE UPDATE */
    function completeBiometricVerification(stream) {
      // Stop webcam stream if active
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      // Update State Flags
      AppState.singpassRetrieved = true;
      AppState.facePassed = true;
      AppState.biometricScore = 98.4;

      // Update Telemetry Monitor Indicator
      const sigBio = document.getElementById('sig-bio');
      if (sigBio) {
        sigBio.innerText = "PASS (98.4%)";
        sigBio.className = "telemetry-val pass";
      }

      // 1. Hide Biometric Viewport
      document.getElementById('bioWrapper').style.display = 'none';

      // 2. Change Red Button Text & Disable It
      const btnSingpass = document.getElementById('btnSingpassTrigger');
      btnSingpass.innerText = "Retrieved Singpass MyInfo";
      btnSingpass.style.backgroundColor = "var(--emerald-primary)";
      btnSingpass.style.cursor = "default";
      btnSingpass.disabled = true;

      document.getElementById('singpassBoxDesc').innerText = "Singpass verification completed successfully. MyInfo fields populated below.";

      // 3. Populate Director Fields from Singpass MyInfo
      document.getElementById('inpName').value = "TAN WEI MING";
      document.getElementById('inpId').value = "S9876543A";
      document.getElementById('selNationality').value = "Singaporean";
      document.getElementById('inpResAddress').value = "BLK 123 MARINA BAY RESIDENCES #18-04, SINGAPORE 018982";

      // 4. Reveal Form Fields Logically
      document.getElementById('directorFieldsContainer').style.display = 'block';

      // Save State
      saveToLocalStorage();
      showToast("Singpass MyInfo and Facial Verification successful!", "success");
    }

    /* STEP NAVIGATION VALIDATION FOR PANEL 3 */
    function handleBioNextStep() {
      if (!AppState.singpassRetrieved) {
        showToast("Please complete Singpass MyInfo retrieval before proceeding.", "error");
        return;
      }

      const pep = document.getElementById('selPep').value;
      if (!pep) {
        showToast("Please select the PEP Status.", "error");
        document.getElementById('selPep').classList.add('input-error');
        return;
      }

      document.getElementById('selPep').classList.remove('input-error');
      navigate(4);
    }

    /* STEP 4: UBO REPEATER */
    let uboCount = 1;
    function addUboField() {
      uboCount++;
      const container = document.getElementById('ubo-container');
      const div = document.createElement('div');
      div.className = 'repeater-box ubo-item';
      div.innerHTML = `
        <div class="repeater-header">
          <span style="font-size: 0.85rem; font-weight: 700; color: var(--blue-light);">Beneficial Owner #${uboCount}</span>
          <button type="button" class="btn-remove-ubo" onclick="this.closest('.ubo-item').remove(); updateUboChecksum();">✕ Remove UBO</button>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label>UBO Full Name *</label>
            <input type="text" class="ubo-name" placeholder="Enter UBO's full legal name" required />
          </div>
          <div class="form-group">
            <label>Ownership / Voting Rights % *</label>
            <input type="number" class="ubo-shares" placeholder="Enter percentage" min="1" max="100" required />
          </div>
          <div class="form-group">
            <label>Tax Residence Jurisdiction *</label>
            <input type="text" class="ubo-tax-res" placeholder="Enter tax residence" required />
          </div>
          <div class="form-group">
            <label>PEP Status *</label>
            <select class="ubo-pep" required>
              <option value="No — Not a PEP">No — Not a PEP</option>
              <option value="Yes — Domestic PEP">Yes — Domestic PEP</option>
              <option value="Yes — Foreign PEP">Yes — Foreign PEP</option>
              <option value="Yes — International Org PEP">Yes — International Org PEP</option>
              <option value="Yes — Family / Associate of PEP">Yes — Family / Associate of PEP</option>
            </select>
          </div>
        </div>
      `;
      container.appendChild(div);
      saveToLocalStorage();
    }

    function addUboFieldWithData(idx, data) {
      const container = document.getElementById('ubo-container');
      const div = document.createElement('div');
      div.className = 'repeater-box ubo-item';
      div.innerHTML = `
        <div class="repeater-header">
          <span style="font-size: 0.85rem; font-weight: 700; color: var(--blue-light);">Beneficial Owner #${idx}</span>
          ${idx > 1 ? `<button type="button" class="btn-remove-ubo" onclick="this.closest('.ubo-item').remove(); updateUboChecksum();">✕ Remove UBO</button>` : ''}
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label>UBO Full Name *</label>
            <input type="text" class="ubo-name" value="${data.name || ''}" placeholder="Enter UBO's full legal name" required />
          </div>
          <div class="form-group">
            <label>Ownership / Voting Rights % *</label>
            <input type="number" class="ubo-shares" value="${data.shares || ''}" placeholder="Enter percentage" min="1" max="100" required />
          </div>
          <div class="form-group">
            <label>Tax Residence Jurisdiction *</label>
            <input type="text" class="ubo-tax-res" value="${data.taxRes || ''}" placeholder="Enter tax residence" required />
          </div>
          <div class="form-group">
            <label>PEP Status *</label>
            <select class="ubo-pep" required>
              <option value="No — Not a PEP" ${data.pep === 'No — Not a PEP' ? 'selected' : ''}>No — Not a PEP</option>
              <option value="Yes — Domestic PEP" ${data.pep === 'Yes — Domestic PEP' ? 'selected' : ''}>Yes — Domestic PEP</option>
              <option value="Yes — Foreign PEP" ${data.pep === 'Yes — Foreign PEP' ? 'selected' : ''}>Yes — Foreign PEP</option>
              <option value="Yes — International Org PEP" ${data.pep === 'Yes — International Org PEP' ? 'selected' : ''}>Yes — International Org PEP</option>
              <option value="Yes — Family / Associate of PEP" ${data.pep === 'Yes — Family / Associate of PEP' ? 'selected' : ''}>Yes — Family / Associate of PEP</option>
            </select>
          </div>
        </div>
      `;
      container.appendChild(div);
    }

    function updateUboChecksum() {
      let totalShares = 0;
      let valid = true;

      document.querySelectorAll('.ubo-item').forEach(item => {
        const name = item.querySelector('.ubo-name')?.value.trim();
        const shares = parseFloat(item.querySelector('.ubo-shares')?.value || 0);

        if (!name || isNaN(shares) || shares <= 0) valid = false;
        totalShares += shares;
      });

      if (valid && totalShares > 0) {
        updateTelemetry('sig-ubo', `${totalShares}% LOGGED`, totalShares >= 100 ? 'pass' : 'pending');
      } else {
        updateTelemetry('sig-ubo', 'PENDING', 'neutral');
      }
      saveToLocalStorage();
    }

    function submitUbos() {
      let valid = true;
      let totalShares = 0;

      document.querySelectorAll('.ubo-item').forEach(item => {
        const name = item.querySelector('.ubo-name')?.value.trim();
        const shares = parseFloat(item.querySelector('.ubo-shares')?.value || 0);
        const taxRes = item.querySelector('.ubo-tax-res')?.value.trim();

        if (!name || !shares || !taxRes) valid = false;
        totalShares += shares;
      });

      if (!valid) {
        showToast('Please fill out all UBO fields accurately.', 'error');
        return;
      }

      updateTelemetry('sig-ubo', `${totalShares}% VERIFIED`, 'pass');
      navigate(5);
    }

    /* STEP 5: FINANCIAL PROFILE & CDD */
    function submitCdd() {
      const sow = document.getElementById('selSow').value;
      const turnover = document.getElementById('selTurnover').value;
      const maxtx = document.getElementById('inpMaxTx').value;
      const remittance = document.getElementById('inpRemittance').value.trim();

      if (!sow || !turnover || !maxtx || !remittance) {
        showToast('Please complete all financial activity and source of wealth details.', 'error');
        return;
      }
      navigate(6);
    }

    /* STEP 6: VERIFICATION WIZARD */
    function setBizProfileMode(mode) {
      AppState.bizProfileMode = mode;
      const btnAcra = document.getElementById('btn-toggle-acra');
      const btnUpload = document.getElementById('btn-toggle-upload');
      const containerAcra = document.getElementById('mode-acra-container');
      const containerUpload = document.getElementById('mode-upload-container');

      if (mode === 'acra') {
        btnAcra.classList.add('active');
        btnUpload.classList.remove('active');
        containerAcra.style.display = 'block';
        containerUpload.style.display = 'none';
      } else {
        btnUpload.classList.add('active');
        btnAcra.classList.remove('active');
        containerUpload.style.display = 'block';
        containerAcra.style.display = 'none';
      }
    }

    function executeAcraFetchWizard() {
      const btn = document.getElementById('btn-fetch-acra');
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner"></span> Fetching BizFile from Registry...`;

      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = `✓ BizFile Profile Fetched (ACRA Registry)`;
        btn.style.borderColor = 'var(--emerald-primary)';
        btn.style.color = 'var(--emerald-light)';

        AppState.bizProfileFetched = true;
        AppState.documentsUploaded.doc1 = true;
        AppState.documentNames.doc1 = 'ACRA_BizFile_Extract_Official.pdf';

        const badge = document.getElementById('badge-wiz1');
        badge.innerText = 'VERIFIED';
        badge.className = 'doc-wizard-badge badge-verified';

        checkAllDocsStatus();
        saveToLocalStorage();
        showToast('Official ACRA BizFile fetched and verified.');
      }, 1500);
    }

    function handleFileSelected(docKey, docLabel) {
      const input = document.getElementById(`file-${docKey}`);
      if (input && input.files && input.files[0]) {
        const file = input.files[0];
        AppState.documentsUploaded[docKey] = true;
        AppState.documentBlobs[docKey] = file;
        AppState.documentNames[docKey] = file.name;

        const dropzone = document.getElementById(`dropzone-${docKey}`);
        if (dropzone) dropzone.classList.add('has-file');

        const text = document.getElementById(`text-${docKey}`);
        if (text) text.innerText = `Attached: ${file.name}`;

        const badgeKey = docKey.replace('doc', '');
        const badge = document.getElementById(`badge-wiz${badgeKey}`);
        if (badge) {
          badge.innerText = 'VERIFIED';
          badge.className = 'doc-wizard-badge badge-verified';
        }

        checkAllDocsStatus();
        saveToLocalStorage();
        showToast(`${docLabel} uploaded successfully!`);
      }
    }

    function checkAllDocsStatus() {
      const { doc1, doc2, doc3 } = AppState.documentsUploaded;
      if (doc1 && doc2 && doc3) {
        updateTelemetry('sig-docs', 'ALL VERIFIED', 'pass');
      } else {
        const count = [doc1, doc2, doc3].filter(Boolean).length;
        updateTelemetry('sig-docs', `${count}/3 READY`, 'pending');
      }
    }

    function submitVerificationWizard() {
      const { doc1, doc2, doc3 } = AppState.documentsUploaded;
      if (!doc1 || !doc2 || !doc3) {
        showToast('Please submit or fetch all required verification documents.', 'error');
        return;
      }
      navigate(7);
    }

    /* STEP 7: AML SCREENING ENGINE */
    function handleAmlButtonClick() {
      const fatca = document.getElementById('selFatca').value;
      const tin = document.getElementById('inpTin').value.trim();

      if (!fatca || !tin) {
        showToast('Please select FATCA classification and enter Tax Identification Number.', 'error');
        return;
      }

      const btn = document.getElementById('btnAml');
      const barContainer = document.getElementById('amlBarContainer');
      const bar = document.getElementById('amlBar');
      const consoleBox = document.getElementById('amlConsole');

      btn.disabled = true;
      btn.innerHTML = `<span class="spinner"></span> SCREENING...`;
      barContainer.style.display = 'block';
      consoleBox.style.display = 'flex';
      consoleBox.innerHTML = '';
      bar.style.width = '0%';

      const company = document.getElementById('inpCompany').value || 'ENTITY';
      const director = document.getElementById('inpName').value || 'DIRECTOR';

      const screeningLogs = [
        `[AML-ENGINE] Initializing screening protocols for ${company}...`,
        `[SANCTIONS] Cross-referencing UN Security Council Consolidated List... MATCH: 0`,
        `[SANCTIONS] Querying US OFAC SDN & Blocked Persons List... MATCH: 0`,
        `[MAS-626] Checking MAS Notice 626 Prohibited Entities Index... MATCH: 0`,
        `[INTERPOL] Querying Interpol Red Notices database for ${director}... MATCH: 0`,
        `[PEP-CHECK] Validating PEP exposure index for declared officers... LOW RISK`,
        `[FATCA-ENGINE] Validating TIN/UEN ${tin} format & tax residency... VALID`,
        `[AML-ENGINE] Screening Complete. Risk Index Computed.`
      ];

      let progress = 0;
      let delay = 0;

      screeningLogs.forEach((log, index) => {
        delay += 400;
        setTimeout(() => {
          progress += 12.5;
          bar.style.width = `${progress}%`;

          const line = document.createElement('div');
          line.className = 'console-line';
          line.innerText = log;
          consoleBox.appendChild(line);
          consoleBox.scrollTop = consoleBox.scrollHeight;

          if (index === screeningLogs.length - 1) {
            btn.disabled = false;
            btn.innerHTML = `✓ SCREENING PASSED — PROCEED TO FINAL DECISION →`;
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-warning');
            btn.onclick = () => navigate(8);

            AppState.amlCleared = true;
            updateTelemetry('sig-aml', 'CLEARED', 'pass');
            saveToLocalStorage();
            showToast('AML & Sanctions Screening Completed. Zero Hits Found.');
          }
        }, delay);
      });
    }

    /* STEP 8: FINAL SUMMARY & COMPOSITE RISK ENGINE */
    function renderComprehensiveSummary() {
      document.getElementById('prev-country').innerText = document.getElementById('selCountry').value || 'Singapore';
      document.getElementById('prev-uen').innerText = document.getElementById('inpUen').value || '-';
      document.getElementById('prev-company').innerText = document.getElementById('inpCompany').value || '-';
      document.getElementById('prev-incdate').innerText = document.getElementById('incDate').value || '-';
      document.getElementById('prev-ssic').innerText = document.getElementById('selSsic').value || '-';
      document.getElementById('prev-capital').innerText = document.getElementById('inpCapital').value ? `SGD $${Number(document.getElementById('inpCapital').value).toLocaleString()}` : '-';
      document.getElementById('prev-website').innerText = document.getElementById('inpWebsite').value || '-';
      document.getElementById('prev-address').innerText = document.getElementById('inpAddress').value || '-';

      document.getElementById('prev-dir-name').innerText = document.getElementById('inpName').value || '-';
      document.getElementById('prev-dir-id').innerText = document.getElementById('inpId').value || '-';
      document.getElementById('prev-dir-nationality').innerText = document.getElementById('selNationality').value || '-';
      document.getElementById('prev-dir-pep').innerText = document.getElementById('selPep').value || '-';
      document.getElementById('prev-dir-address').innerText = document.getElementById('inpResAddress').value || '-';

      // Render UBO List
      const uboContainer = document.getElementById('prev-ubo-list');
      uboContainer.innerHTML = '';
      const uboItems = document.querySelectorAll('.ubo-item');

      if (uboItems.length === 0) {
        uboContainer.innerHTML = `<div class="preview-val-text" style="color: var(--text-muted); font-size: 0.8rem;">No UBOs declared.</div>`;
      } else {
        uboItems.forEach((item, idx) => {
          const name = item.querySelector('.ubo-name')?.value || '-';
          const shares = item.querySelector('.ubo-shares')?.value || '0';
          const taxRes = item.querySelector('.ubo-tax-res')?.value || '-';
          const pep = item.querySelector('.ubo-pep')?.value || '-';

          const card = document.createElement('div');
          card.className = 'ubo-preview-card';
          card.innerHTML = `
            <div style="font-size: 0.8rem; font-weight: 700; color: var(--blue-light); margin-bottom: 0.3rem;">UBO #${idx + 1}: ${name}</div>
            <div style="font-size: 0.775rem; color: var(--text-muted);">Equity Ownership: <strong style="color:#fff">${shares}%</strong> | Tax Residence: <strong style="color:#fff">${taxRes}</strong></div>
            <div style="font-size: 0.75rem; color: var(--text-subtle); margin-top: 0.2rem;">PEP Status: ${pep}</div>
          `;
          uboContainer.appendChild(card);
        });
      }

      // Render Documents with Download Links
      ['doc1', 'doc2', 'doc3'].forEach((docKey, i) => {
        const el = document.getElementById(`prev-doc-${i + 1}`);
        if (!el) return;

        const name = AppState.documentNames[docKey] || `Document_${i + 1}.pdf`;
        const blob = AppState.documentBlobs[docKey];

        if (blob) {
          const url = URL.createObjectURL(blob);
          el.innerHTML = `<a href="${url}" download="${name}" class="download-link">📄 ${name} (Download)</a>`;
        } else if (AppState.documentsUploaded[docKey]) {
          el.innerHTML = `<span class="download-link" style="cursor:default;">✓ ${name} (Verified)</span>`;
        } else {
          el.innerText = 'Not Attached';
        }
      });

      document.getElementById('prev-sow').innerText = document.getElementById('selSow').value || '-';
      document.getElementById('prev-turnover').innerText = document.getElementById('selTurnover').value || '-';
      document.getElementById('prev-maxtx').innerText = document.getElementById('inpMaxTx').value ? `SGD $${Number(document.getElementById('inpMaxTx').value).toLocaleString()}` : '-';
      document.getElementById('prev-remittance').innerText = document.getElementById('inpRemittance').value || '-';
      document.getElementById('prev-fatca').innerText = document.getElementById('selFatca').value || '-';
      document.getElementById('prev-tin').innerText = document.getElementById('inpTin').value || '-';
    }

    function calculateAndRenderFinalOutcome() {
      let riskScore = 12; // Base inherent risk

      const pepVal = document.getElementById('selPep').value;
      if (pepVal && pepVal.includes('Yes')) riskScore += 35;

      const sowVal = document.getElementById('selSow').value;
      if (sowVal && sowVal.includes('Investment')) riskScore += 10;

      AppState.calculatedScore = Math.min(riskScore, 100);

      const badge = document.getElementById('outBadge');
      const title = document.getElementById('outTitle');
      const sub = document.getElementById('outSub');
      const scoreEl = document.getElementById('outScore');
      const bioEl = document.getElementById('outBio');
      const acraEl = document.getElementById('outAcra');
      const resultEl = document.getElementById('outResult');
      const timeEl = document.getElementById('outTime');

      scoreEl.innerText = `${AppState.calculatedScore} / 100 (${AppState.calculatedScore < 40 ? 'LOW RISK' : 'MEDIUM RISK'})`;
      bioEl.innerText = `${AppState.biometricScore}% MATCH`;
      acraEl.innerText = AppState.acraVerified ? 'VERIFIED MATCH' : 'UNVERIFIED';
      timeEl.innerText = new Date().toISOString();

      if (AppState.calculatedScore < 50) {
        badge.className = 'outcome-badge approved';
        badge.innerText = '✓';
        title.innerText = 'Straight-Through Approval Granted';
        sub.innerText = 'Entity verified under low-risk parameters. Account ready for immediate activation.';
        resultEl.innerText = 'AUTOMATED APPROVAL';
        resultEl.style.color = 'var(--emerald-light)';
      } else {
        badge.className = 'outcome-badge review';
        badge.innerText = '⚠️';
        title.innerText = 'Enhanced Due Diligence (EDD) Required';
        sub.innerText = 'Elevated risk parameters detected. Escalated to Compliance Team for manual review.';
        resultEl.innerText = 'EDD MANUAL REVIEW';
        resultEl.style.color = 'var(--amber-light)';
      }
    }

    function resetEngine() {
      if (confirm('Are you sure you want to reset the engine and restart onboarding?')) {
        clearEverything();
      }
    }