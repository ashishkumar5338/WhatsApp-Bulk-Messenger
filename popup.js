document.addEventListener('DOMContentLoaded', function () {
    const sendButton = document.getElementById('send');

    if (sendButton) {
        sendButton.addEventListener('click', async function (event) {
            event.preventDefault();

            const contactsTextarea = document.getElementById('contacts');
            const messageTextarea = document.getElementById('message');
            const imageFileInput = document.getElementById('imageFile');

            const contacts = contactsTextarea.value.split(',').map(contact => contact.trim());
            const message = messageTextarea.value.trim();
            const imageFile = imageFileInput.files[0]; // Get the selected file

            if (contacts.length === 0 || message === '') {
                alert('Please enter at least one contact and a message.');
                return;
            }

            // Check if an image file was selected
            let imageUrl = imageFile ? URL.createObjectURL(imageFile) : "";
            if (imageFile) {
                chrome.storage.local.set({
                    sendOne: true,
                    stage: "redirecting",
                    text: "",
                    image: imageFile ? URL.createObjectURL(imageFile) : "",
                    caption: 0
                });
                // Proceed to send messages
                sendMessages(contacts, message, imageUrl);
            } else {
                // No image file selected, proceed without image URL
                sendMessages(contacts, message, imageUrl);
            }
        });
    } else {
        console.error('Send button not found');
    }

    function sendMessages(contacts, message, imageUrl) {
        // Get the current active tab
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            const activeTab = tabs[0];
            const tabId = activeTab.id;

            // Send a message to the content script in the active tab
            chrome.tabs.sendMessage(tabId, { action: "sendMessages", contacts, message, imageUrl }, function (response) {
                if (chrome.runtime.lastError) {
                    console.log(chrome.runtime.lastError.message);
                    return;
                }

                if (response && response.status === "Messages sent") {
                    console.log('Messages sent successfully');
                } else {
                    console.error('Error sending messages:', response);
                }
            });
        });
    }

    function displayImagePreview(imageUrl) {
        const imagePreviewContainer = document.getElementById('imagePreviewContainer');
        const imagePreview = document.getElementById('imagePreview');

        if (imageUrl) {
            imagePreview.src = imageUrl;
            imagePreviewContainer.style.display = 'block';
        } else {
            imagePreview.src = '#';
            imagePreviewContainer.style.display = 'none';
        }
    }

    // Initialize image preview if there is an initial value
    const imageFileInput = document.getElementById('imageFile');
    if (imageFileInput) {
        imageFileInput.addEventListener('change', function () {
            const imageFile = imageFileInput.files[0];
            if (imageFile) {
                const reader = new FileReader();
                reader.onload = function () {
                    const imageUrl = reader.result;
                    displayImagePreview(imageUrl);
                };
                reader.readAsDataURL(imageFile);
            } else {
                displayImagePreview('');
            }
        });
    }
});
