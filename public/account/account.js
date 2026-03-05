document.addEventListener("DOMContentLoaded", () => {

    let isEditing = false;

    window.toggleEdit = function () {
        isEditing = !isEditing;

        document.querySelectorAll('.editable').forEach(el => {
            el.classList.toggle('hidden', !isEditing);
        });

        document.querySelectorAll('.readable').forEach(el => {
            el.classList.toggle('hidden', isEditing);
        });

        document.getElementById('editBtn')
            .classList.toggle('hidden', isEditing);

        document.getElementById('profileImage')
            .classList.toggle('opacity-40', isEditing);
    };


    const profileImage = document.getElementById("profileImage");
    const imageInput = document.getElementById("imageInput");

    if (profileImage && imageInput) {

        profileImage.addEventListener("click", () => {
            if (isEditing) {
                imageInput.click();
            }
        });

        imageInput.addEventListener("change", async () => {

            const file = imageInput.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append("profileImage", file);

            const res = await fetch("/api/account/upload-profile", {
                method: "POST",
                body: formData
            });

            const data = await res.json();

            if (data.success) {
                profileImage.src = "/images/profile/" + data.imagePath;

                Swal.fire({
                    icon: "success",
                    title: "สำเร็จ",
                    text: "อัปโหลดรูปโปรไฟล์เรียบร้อย"
                });
            } else {
                Swal.fire({
                    icon: "error",
                    title: "เกิดข้อผิดพลาด",
                    text: "ไม่สามารถอัปโหลดรูปได้"
                });
            }
        });
    }


    window.saveChanges = async function () {

        const username = document.getElementById("newUsername")?.value.trim();
        const oldPassword = document.getElementById("oldPassword")?.value;
        const newPassword = document.getElementById("newPassword")?.value;
        const confirmPassword = document.getElementById("confirmPassword")?.value;

        if (username && username.length < 3) {
            await Swal.fire({
                icon: "warning",
                title: "ข้อมูลไม่ถูกต้อง",
                text: "ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร"
            });
            return;
        }

        if (newPassword || confirmPassword || oldPassword) {

            if (!oldPassword) {
                await Swal.fire({
                    icon: "warning",
                    title: "ข้อมูลไม่ครบ",
                    text: "กรุณากรอกรหัสผ่านเก่า"
                });
                return;
            }

            if (!newPassword) {
                await Swal.fire({
                    icon: "warning",
                    title: "ข้อมูลไม่ครบ",
                    text: "กรุณากรอกรหัสผ่านใหม่"
                });
                return;
            }

            if (newPassword.length < 8) {
                await Swal.fire({
                    icon: "error",
                    title: "รหัสผ่านไม่ปลอดภัย",
                    text: "รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร"
                });
                return;
            }

            if (newPassword !== confirmPassword) {
                await Swal.fire({
                    icon: "error",
                    title: "รหัสผ่านไม่ตรงกัน",
                    text: "รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน"
                });
                return;
            }
        }

        const res = await fetch("/api/account/update", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username,
                oldPassword,
                newPassword
            })
        });

        const data = await res.json();

        if (data.success) {

            await Swal.fire({
                icon: "success",
                title: "บันทึกสำเร็จ",
                text: "ข้อมูลโปรไฟล์ถูกอัปเดตแล้ว"
            });

            location.reload();

        } else {

            Swal.fire({
                icon: "error",
                title: "เกิดข้อผิดพลาด",
                text: data.message || "ไม่สามารถบันทึกข้อมูลได้"
            });

        }
    };

});