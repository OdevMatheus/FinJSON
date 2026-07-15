import './style.css';
import { LocalStore } from './lib/store';

// Onboarding DOM Elements
const btnInitBlank = document.getElementById('btn-init-blank');
const fileInput = document.getElementById('import-file-input');
const btnTriggerUpload = document.getElementById('btn-trigger-upload');
const selectedFileName = document.getElementById('selected-file-name');
const btnSubmitImport = document.getElementById('btn-submit-import');
const importDropZone = document.getElementById('import-drop-zone');

// Core Initialization
document.addEventListener('DOMContentLoaded', () => {
  setupOnboardingListeners();
});

// Setup Listeners
function setupOnboardingListeners() {
  // Option 1: Click on "Iniciar do Zero"
  if (btnInitBlank) {
    btnInitBlank.addEventListener('click', handleInitializeDatabase);
  }

  // Option 2: Click on Custom "Selecionar Arquivo" Button
  if (btnTriggerUpload && fileInput) {
    btnTriggerUpload.addEventListener('click', () => {
      fileInput.click();
    });
  }

  // On File Selection Change
  if (fileInput) {
    fileInput.addEventListener('change', handleFileSelection);
  }

  // Submit file import
  if (btnSubmitImport) {
    btnSubmitImport.addEventListener('click', handleImportDatabase);
  }

  // Drag and Drop hover visual bindings
  if (importDropZone) {
    importDropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      importDropZone.style.borderColor = 'var(--primary-color)';
    });

    importDropZone.addEventListener('dragleave', () => {
      importDropZone.style.borderColor = 'var(--border-color)';
    });

    importDropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      importDropZone.style.borderColor = 'var(--border-color)';
      
      if (e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.type === "application/json" || file.name.endsWith('.json')) {
          fileInput.files = e.dataTransfer.files;
          handleFileSelection();
        } else {
          alert('Por favor, selecione apenas arquivos do tipo .json');
        }
      }
    });
  }
}

// Action: Create clean database blank template
function handleInitializeDatabase() {
  if (!confirm('Deseja iniciar uma nova carteira de dados limpa com categorias essenciais?')) return;

  try {
    LocalStore.initializeBlank();
    alert('Sucesso! Uma nova carteira digital limpa foi criada e persistida com sucesso no seu navegador.');
    
    // Clear upload inputs
    resetUploadInputs();
  } catch (err) {
    console.error('Database initialization failed:', err);
    alert('Erro ao inicializar banco de dados: ' + err.message);
  }
}

// Action: Handle chosen file metadata updates
function handleFileSelection() {
  if (!fileInput.files || fileInput.files.length === 0) return;

  const file = fileInput.files[0];
  selectedFileName.textContent = file.name;
  
  if (btnSubmitImport) {
    btnSubmitImport.style.display = 'block';
  }
}

// Action: Read JSON file and import to LocalStore
function handleImportDatabase() {
  if (!fileInput.files || fileInput.files.length === 0) return;

  const file = fileInput.files[0];
  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      const jsonData = JSON.parse(e.target.result);
      
      // Import locally
      LocalStore.importDatabase(jsonData);

      alert('Backup de dados importado e restaurado com sucesso no seu navegador!');
      resetUploadInputs();

    } catch (err) {
      console.error('Import failed:', err);
      alert('Falha ao restaurar backup: ' + err.message);
    }
  };

  reader.onerror = () => {
    alert('Erro ao ler o arquivo selecionado.');
  };

  reader.readAsText(file);
}

// Helper to reset upload controls
function resetUploadInputs() {
  if (fileInput) fileInput.value = '';
  if (selectedFileName) selectedFileName.textContent = 'Nenhum arquivo selecionado';
  if (btnSubmitImport) btnSubmitImport.style.display = 'none';
}
