document.addEventListener('DOMContentLoaded', function () {
    const sendButton = document.getElementById('send');
    const stopButton = document.getElementById("stop");
    const fileUploadButton = document.getElementById('fileUploadButton');
    const fileInputContainer = document.getElementById('fileInputContainer');
    const imageVideoButton = document.getElementById('imageVideoButton');
    const documentButton = document.getElementById('documentButton');
    const imageFilesInput = document.getElementById('imageFiles');
    const documentFilesInput = document.getElementById('documentFiles');
    const fileInfoContainer = document.getElementById('fileInfo');
    const previewContainer = document.getElementById('imagePreviewContainer');
    const contactsTextarea = document.getElementById('contacts');
    const messageTextarea = document.getElementById('message');
    let type = "image/video";

    let sendingMessages = false;
    let timerInterval;

    // Function to update the count of contacts
    function updateCount() {
        // Get the value of the textarea
        const contactsValue = contactsTextarea.value.trim();
        const message = messageTextarea.value.trim();

        // Split the value into an array of contacts using commas as separator
        const contactsArray = contactsValue.split(',').map(contact => contact.trim());

        // Remove empty strings from the array (in case there are consecutive commas)
        const filteredContactsArray = contactsArray.filter(contact => contact !== '');

        // Update the number of contacts
        const contactCount = filteredContactsArray.length;
        const messageCount = message.length;
        // console.log(`Number of contacts: ${contactCount} ${filteredContactsArray}`);
        const contactCountSpan = document.getElementById("contactsCount");
        const messageCountSpan = document.getElementById("messageCount");
        contactCountSpan.textContent = contactCount;
        messageCountSpan.textContent = messageCount;
    }

    // Add event listener for the input event
    contactsTextarea.addEventListener('input', updateCount);
    messageTextarea.addEventListener('input', updateCount);


    // Toggle file input fields and button text when the attach button is clicked
    fileUploadButton.addEventListener('click', function () {
        if (fileInputContainer.style.display === 'block') {
            fileInputContainer.style.display = 'none';
            fileUploadButton.textContent = 'Attach Files (optional)';
            // Clear all input files
            imageFilesInput.value = '';
            documentFilesInput.value = '';
            fileInfoContainer.innerHTML = "";
            fileInfoContainer.style.display = 'none';
            previewContainer.innerHTML = '';
            previewContainer.style.display = 'none';
        } else {
            fileInputContainer.style.display = 'block';
            fileUploadButton.textContent = 'Close Attachment';
        }
    });


    // Toggle between Photos & Videos and PDF/Zip/Document Files
    imageVideoButton.addEventListener('click', function () {
        if (!imageVideoButton.classList.contains('active')) {
            imageVideoButton.classList.add('active');
            documentButton.classList.remove('active');
            document.getElementById('image/video').style.display = 'block';
            document.getElementById('document').style.display = 'none';
            documentFilesInput.value = '';
            fileInfoContainer.innerHTML = "";
            fileInfoContainer.style.display = 'none';
            previewContainer.innerHTML = '';
            previewContainer.style.display = 'none';
            type = "image/video";
        }
    });

    documentButton.addEventListener('click', function () {
        if (!documentButton.classList.contains('active')) {
            documentButton.classList.add('active');
            imageVideoButton.classList.remove('active');
            document.getElementById('image/video').style.display = 'none';
            document.getElementById('document').style.display = 'block';
            imageFilesInput.value = '';
            fileInfoContainer.innerHTML = "";
            fileInfoContainer.style.display = 'none';
            previewContainer.innerHTML = '';
            previewContainer.style.display = 'none';
            type = "document";
        }
    });

    // Function to load stored data from Chrome storage
    function loadData() {
        chrome.storage.local.get(['contacts', 'message'], function (data) {
            // console.log(data);
            if (data.contacts) {
                contactsTextarea.value = data.contacts.join(', ');
                // console.log(data.contacts);
                contactsTextarea.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: contactsTextarea.value }));
            }
            if (data.message) {
                messageTextarea.value = data.message;
                messageTextarea.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: messageTextarea.value }));
            }
        });
    }

    // Load stored data when popup is opened
    loadData();

    if (sendButton) {
        sendButton.addEventListener('click', async function (event) {
            event.preventDefault();

            // const uploadFileInput = document.getElementById('imageFiles');
            const messageIntervalInput = document.getElementById('messageInterval');
            const clickIntervalInput = document.getElementById('clickInterval');

            const contactsArray = contactsTextarea.value.split(',').map(contact => contact.trim());
            const contacts = contactsArray.filter(contact => contact !== '');
            const message = messageTextarea.value.trim();
            const messageInterval = parseInt(messageIntervalInput.value, 10);
            const clickInterval = parseInt(clickIntervalInput.value, 10);
            const uploadFiles = Array.from(imageFilesInput.files).concat(Array.from(documentFilesInput.files)); // Get the selected files
            // console.log(uploadFiles);

            if (contacts.length === 0) {
                alert('Please enter at least one contact.');
                return;
            }

            if (message === '' && uploadFiles.length == 0) {
                alert('Please enter at least some message or attach a file.');
                return;
            }

            let files = { urls: [], names: [], types: [] };
            let interval = { message: 4000, click: 1000 };

            if (messageInterval >= 2 && clickInterval >= 1) {
                interval = { message: messageInterval * 1000, click: clickInterval * 1000 };
                // console.log(interval);
            }

            if (uploadFiles.length > 0) {
                // Get URLs, names, and types for all selected files
                files = {
                    urls: uploadFiles.map(file => URL.createObjectURL(file)),
                    names: uploadFiles.map(file => file.name),
                    types: uploadFiles.map(file => file.type)
                };
            }

            // Store data in Chrome storage
            chrome.storage.local.set({
                sendOne: true,
                stage: "redirecting",
                contacts: contacts,
                message: message,
                caption: 0
            });

            // Proceed to send messages
            sendMessages(contacts, message, files, type, interval);

            sendButton.style.display = "none";
            stopButton.style.display = "inline-block";

            // Calculate total time for the process
            const totalTime = (interval.message + 9 * interval.click + 5000) * contacts.length; // in milliseconds
            // console.log(totalTime);
            // Call the function to start displaying the timer
            timerInterval = displayTimer(totalTime);
            // console.log(timerInterval);

        });
    } else {
        console.error('Send button not found');
    }

    if (stopButton) {
        stopButton.addEventListener('click', async function (event) {

            sendButton.style.display = "inline-block";
            stopButton.style.display = "none";

            stopMessages();

            stopTimer(timerInterval)
        });
    } else {
        console.error('Stop button not found');
    }



    function sendMessages(contacts, message, files, type, interval) {
        sendingMessages = true;

        // Get the current active tab
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            const activeTab = tabs[0];
            const tabId = activeTab.id;

            // Send a message to the content script in the active tab
            chrome.tabs.sendMessage(tabId, { action: "sendMessages", contacts, message, files, type, interval }, function (response) {
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

    function stopMessages() {
        sendingMessages = false;

        // Inform content script to stop
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, { action: "stopMessages" }, function (response) {
                if (chrome.runtime.lastError) {
                    console.log(chrome.runtime.lastError.message);
                    return;
                }

                if (response && response.status === "Message sending stopped.") {
                    console.log('Messages sending stopped successfully');
                } else {
                    console.error('Error in stopping messages:', response);
                }
            });
        });
    }

    // Display previews for images, videos, and PDFs
    function displayPreviews(files) {
        previewContainer.innerHTML = ''; // Clear existing previews

        if (files.length > 0) {
            previewContainer.style.display = 'block';
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const reader = new FileReader();
                reader.onload = function (event) {
                    if (file.type.startsWith('image')) {
                        const img = document.createElement('img');
                        img.src = event.target.result;
                        img.style.maxWidth = '100%';
                        img.style.maxHeight = '200px';
                        previewContainer.appendChild(img);
                    } else if (file.type.startsWith('video')) {
                        const video = document.createElement('video');
                        video.src = event.target.result;
                        video.controls = true;
                        video.style.maxWidth = '100%';
                        video.style.maxHeight = '200px';
                        video.style.width = 'calc(100% + 20px)';
                        previewContainer.appendChild(video);
                    } else if (file.type === 'application/pdf') {
                        const iframe = document.createElement('iframe');
                        iframe.src = event.target.result;
                        iframe.style.width = '100%';
                        iframe.style.height = '200px';
                        previewContainer.appendChild(iframe);
                    }
                    else if (file.type === 'text/plain') {
                        const textFile = document.createElement('iframe');
                        textFile.src = event.target.result;
                        textFile.style.width = '100%';
                        textFile.style.height = '200px';
                        textFile.style.border = '1px solid #ccc';
                        previewContainer.appendChild(textFile);
                    }
                };
                reader.readAsDataURL(file);
            }
        } else {
            previewContainer.style.display = 'none';
        }
    }

    function displayFileInfo(files) {
        fileInfoContainer.innerHTML = '';

        if (files.length > 0) {
            fileInfoContainer.style.display = 'block';
            const fileCount = files.length;

            const infoText = document.createElement('p');
            infoText.textContent = `Selected ${fileCount} file(s):`;

            const fileList = document.createElement('ul');
            files.forEach(file => {
                const listItem = document.createElement('li');
                listItem.textContent = file.name;
                fileList.appendChild(listItem);
            });

            fileInfoContainer.appendChild(infoText);
            fileInfoContainer.appendChild(fileList);
        } else {
            fileInfoContainer.style.display = 'none';
        }
    }

    // Function to display the timer
    function displayTimer(totalTime) {
        document.getElementById('timer').style.display = 'block';
        const timerElement = document.getElementById("timeLeft");
        let remainingTime = totalTime;

        const timerInterval = setInterval(() => {
            remainingTime -= 1000;
            if (remainingTime <= 0) {
                clearInterval(timerInterval);
                timerElement.textContent = "0 seconds";
                sendButton.style.display = "inline-block";
                stopButton.style.display = "none";
            } else {
                const seconds = Math.ceil(remainingTime / 1000);
                timerElement.textContent = `${seconds} seconds`;
            }
        }, 1000);

        // Return the interval ID to stop it later
        return timerInterval;
    }

    // Function to stop the timer
    function stopTimer(timerInterval) {
        clearInterval(timerInterval);
        document.getElementById('timer').style.display = 'none';
    }

    if (imageFilesInput) {
        imageFilesInput.addEventListener('change', function () {
            const files = Array.from(imageFilesInput.files);
            displayPreviews(files);
            displayFileInfo(files);
        });
    }

    if (documentFilesInput) {
        documentFilesInput.addEventListener('change', function () {
            const files = Array.from(documentFilesInput.files);
            displayPreviews(files);
            displayFileInfo(files);
        });
    }

    // Save data to Chrome storage when popup loses focus (clicked outside)
    window.addEventListener('blur', function () {
        const contacts = contactsTextarea.value.split(',').map(contact => contact.trim());
        const message = messageTextarea.value.trim();

        chrome.storage.local.set({
            sendOne: true,
            stage: "redirecting",
            contacts: contacts,
            message: message,
            caption: 0
        });
    });

});
