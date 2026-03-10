function openEditModal(id, name, phone) {
    document.getElementById('edit_comp_name').value = name;
    document.getElementById('edit_comp_phone').value = phone;

    document.getElementById('editForm').action = `/supplier_management/edit/${id}`;

    document.getElementById('edit-sup-modal').classList.remove('hidden');
}

function closeEditModal() {
    document.getElementById('edit-sup-modal').classList.add('hidden');
}

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        closeEditModal();
        closeDeleteModal();
    }
});

function confirmDelete(id, name) {
    document.getElementById('deleteForm').action = `/supplier_management/delete/${id}`;
    document.getElementById('deleteModal').classList.remove('hidden');
}

function closeDeleteModal() {
    document.getElementById('deleteModal').classList.add('hidden');
}

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeDeleteModal();
});

document.getElementById('deleteModal').addEventListener('click', function(e) {
    if (e.target === this) closeDeleteModal();
});

const modal = document.getElementById('add-sup-modal');

function openModal() {
    modal.classList.remove('hidden');
}

function closeModal() {
    modal.classList.add('hidden');
}

const closeButtons = document.querySelectorAll('[data-modal-hide="add-sup-modal"]');
        
closeButtons.forEach(button => {
    button.addEventListener('click', closeModal);
});

modal.addEventListener('click', (event) => {
    if (event.target === modal) {
        closeModal();
    }
});

const checkAll = document.getElementById('checkAll');
const rowChecks = document.querySelectorAll('.row-check');
const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');

function updateBulkDeleteButton() {
    const checkedCount = document.querySelectorAll('.row-check:checked').length;
    const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
    const tableContainer = document.getElementById('tableContainer');
    const checkAll = document.getElementById('checkAll');
    const rowChecks = document.querySelectorAll('.row-check');
            
    if (checkedCount > 0) {
        bulkDeleteBtn.classList.remove('hidden');
                
        if(tableContainer) tableContainer.style.transform = "translateY(45px)";
        } else {
        bulkDeleteBtn.classList.add('hidden');

    if(tableContainer) tableContainer.style.transform = "translateY(0)";
    }

    if (checkAll && rowChecks.length > 0) {
        checkAll.checked = checkedCount === rowChecks.length;
    }
}

rowChecks.forEach(check => {
    check.addEventListener('change', updateBulkDeleteButton);
});

if (checkAll) {
    checkAll.addEventListener('change', function() {
        rowChecks.forEach(check => {
            check.checked = this.checked;
        });
    updateBulkDeleteButton();
    });
}

document.getElementById('bulkDeleteBtn').addEventListener('click', function() {
    const checkedBoxes = document.querySelectorAll('.row-check:checked');
    const selectedIds = Array.from(checkedBoxes).map(cb => cb.value);

    if (selectedIds.length === 0) return;

    document.getElementById('deleteForm').action = '/supplier_management/bulk-delete';
    document.getElementById('deleteIdsInput').value = selectedIds.join(',');
    document.getElementById('deleteModal').classList.remove('hidden');
});

function handleSearch() {
    const keyword = document.getElementById('searchInput').value;
    window.location.href = `/supplier_management?page=1&limit=<%= limit %>&search=${encodeURIComponent(keyword)}`;
}

document.getElementById('searchInput').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        handleSearch();
    }
});

function handleSearch() {
    const keyword = document.getElementById('searchInput').value;
    const limit = document.getElementById('limitSelect').value;
    const currentSort = '<%= sort %>';

    window.location.href = `/supplier_management?page=1&limit=${limit}&search=${encodeURIComponent(keyword)}&sort=${currentSort}`;
}

function changeLimit(value) {
    const keyword = document.getElementById('searchInput').value;
    const currentSort = '<%= sort %>'; 
            
    window.location.href = `/supplier_management?page=1&limit=${value}&search=${encodeURIComponent(keyword)}&sort=${currentSort}`;
}

function handleSort(sortValue) {
    const searchInput = document.getElementById('searchInput');
    const limitSelect = document.getElementById('limitSelect');
    
    const keyword = searchInput ? searchInput.value : '';
    const limit = limitSelect ? limitSelect.value : 10;
    
    window.location.href = `/supplier_management?page=1&limit=${limit}&search=${encodeURIComponent(keyword)}&sort=${sortValue}`;
}