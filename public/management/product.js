function changeLimit(newLimit) {
    const urlParams = new URLSearchParams(window.location.search);
    const search = urlParams.get('search') || '';
    const sort = urlParams.get('sort') || 'DESC';
    window.location.href = `/product_management?page=1&limit=${newLimit}&search=${search}&sort=${sort}`;
}