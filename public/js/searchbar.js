
const get_translated_transction_type = (type) =>{
	if (type === "IN") return `<span style="color:green;">รับเข้า</span>`
	if (type === "OUT") return `<span style="color:red;">เบิกออก</span>`
	if (type === "ADJUST") return `<span style="color:blue;">ปรับแก้ไข</span>`
}
const get_translated_emp_role = (role) =>{
	if (role === "MANAGER") return `<span style="color:purple;">ผู้จัดการ</span>`
	if (role === "WAREHOUSE") return `<span style="color:green;">เจ้าหน้าที่คลังสินค้า</span>`
	if (role === "SYSTEM") return `<span style="color: #EA7987;">เจ้าหน้าที่ระบบ</span>`
}

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    let debounceTimer;

	const user_role = searchInput.dataset.role;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        clearTimeout(debounceTimer);
        if (query.length < 2) {
            searchResults.classList.add('hidden');
            return;
        }
        debounceTimer = setTimeout(async () => {
            try {
                const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
                
                if (!response.ok) throw new Error("Network response was not ok");
                
                const data = await response.json();
                renderResults(data);
            } catch (error) {
                console.error("Failed to fetch search results:", error);
            }
        }, 300); 
    });
    function renderResults(results) {
        if (results.length === 0) {
            searchResults.innerHTML = '<div class="p-4 text-sm text-gray-500 text-center">ไม่พบข้อมูลที่ตรงกัน</div>';
            searchResults.classList.remove('hidden');
            return;
        }
        const html = results.map(item => 
		{
			if (user_role === 'WAREHOUSE'){
				return `
            <a href="${item.url}" class="block px-6 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-0 cursor-pointer transition-colors">
                <p class="text-[14px] font-bold text-gray-800">สินค้า: ${item.title}</p>
                <div class="flex gap-[10px]">
					<p class="text-[11px] text-gray-500">รหัสสินค้า: ${item.subtitle}</p>
                	<p class="text-[11px] text-gray-500">ประเภทรายการ: ${get_translated_transction_type(item.type)}</p>
				</div>
            </a>
        `
			}
			
			if (user_role === 'MANAGER'){
				if (item.searchType === 'wh')
				{
					return `
								<a href="${item.url}" class="block px-6 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-0 cursor-pointer transition-colors">
									<p class="text-[14px] font-bold text-gray-800">คลัง: ${item.title}</p>
									<div class="flex gap-[10px]">
										<p class="text-[11px] text-gray-500">รหัสคลัง: ${item.subtitle}</p>
										<p class="text-[11px] text-gray-500">เจ้าหน้าที่ผู้ดูแล: ${item.wh_manager}</p>
									</div>
								</a>
					 `
				} else{
					return `
								<a href="${item.url}" class="block px-6 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-0 cursor-pointer transition-colors">
									<p class="text-[14px] font-bold text-gray-800">สินค้า: ${item.title}</p>
									<div class="flex gap-[10px]">
										<p class="text-[11px] text-gray-500">รหัสสินค้า: ${item.subtitle}</p>
										<p class="text-[11px] text-gray-500">ประเภทรายการ: ${get_translated_transction_type(item.type)}</p>
									</div>
								</a>
							`
				}
			}

			if (user_role === 'SYSTEM') {
				if (item.searchType === "user") {
					return `
						<a href="${item.url}" class="block px-6 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-0 cursor-pointer transition-colors">
							<div class="flex gap-[15px] items-center">
                                <img src="/images/profile/${item.img_url ? item.img_url : 'user.png'}" width="50" class="rounded-full object-cover h-[50px] w-[50px]"/>
								<div>
									<p class="text-[14px] font-bold text-gray-800">ชื่อผู้ใช้: ${item.title}</p>
									<div class="flex gap-[10px]">
										<p class="text-[11px] text-gray-500">รหัสพนักงาน: ${item.id}</p>
										<p class="text-[11px] text-gray-500">${item.fullName}</p>
										<p class="text-[11px] text-gray-500">หน้าที่ดูแล: ${get_translated_emp_role(item.role)}</p>
									</div>
								</div>
							</div>
						</a>
					`;
				} else if (item.searchType === "supplier") {
					return `
						<a href="${item.url}" class="block px-6 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-0 cursor-pointer transition-colors">
							<p class="text-[14px] font-bold text-gray-800">ซัพพลายเออร์: ${item.title}</p>
							<div class="flex gap-[10px]">
								<p class="text-[11px] text-gray-500">รหัสซัพพลายเออร์: ${item.subtitle}</p>
							</div>
						</a>
					`;
				} else if (item.searchType === "product") {
					return `
						<a href="${item.url}" class="block px-6 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-0 cursor-pointer transition-colors">
							<p class="text-[14px] font-bold text-gray-800">สินค้า: ${item.title}</p>
							<div class="flex gap-[10px]">
								<p class="text-[11px] text-gray-500">รหัสสินค้า: ${item.subtitle}</p>
							</div>
						</a>
					`;
				}
			}
			
		}
		).join('');
        searchResults.innerHTML = html;
        searchResults.classList.remove('hidden');
    }

    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.add('hidden');
        }
    });
});