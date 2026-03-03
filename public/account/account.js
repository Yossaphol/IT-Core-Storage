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
            }
        });
    }


    window.saveChanges = async function () {

        const username = document.getElementById("newUsername")?.value;
        const oldPassword = document.getElementById("oldPassword")?.value;
        const newPassword = document.getElementById("newPassword")?.value;
        const confirmPassword = document.getElementById("confirmPassword")?.value;

        if (newPassword && newPassword !== confirmPassword) {
            alert("รหัสผ่านใหม่ไม่ตรงกัน");
            return;
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
            location.reload();
        } else {
            alert(data.message || "เกิดข้อผิดพลาด");
        }
    };

});