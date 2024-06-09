chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.action === "sendMessages") {
        const { contacts, message, imageUrl } = request;

        // Helper function to send a message to a single contact
        async function sendMessageToContact(contact, message, imageUrl) {
            try {
                // Open a new chat with the contact
                const newChatButtonSelector = 'div[role="button"][title="New chat"]';
                const newChatButton = await waitForElement(newChatButtonSelector);
                newChatButton.click();

                // Wait for the "Message yourself" option and click it
                const messageYourselfSelector = 'div._ak8j > div._ak8k._ao-u';
                const messageYourselfOption = await waitForElement(messageYourselfSelector); // Updated this line
                messageYourselfOption.click();

                // Wait for the message box to appear and send the contact
                const messageSelfBoxSelector = 'div[contenteditable="true"][data-tab="10"]'; // Updated to the correct data-tab index
                const messageSelfBox = await waitForElement(messageSelfBoxSelector);
                await clearMessageBox(messageSelfBox);

                await typeIntoElement(messageSelfBox, contact);

                // // Click the send button
                // const sendSelfButtonSelector = 'span[data-icon="send"]';
                // const sendSelfButton = await waitForElement(sendSelfButtonSelector);
                // sendSelfButton.click();
                checkForSendButton();
                console.log(`%cSelf Message sent - ${contact}`, 'color: green; font-weight: bold;');

                // Wait for 1 second before proceeding to message contact box
                await wait(1000);

                // Wait for the phone number link to appear and click it
                const lastSentMessage = await waitForLastSentMessage();
                const phoneNumberLinkSelector = 'span.selectable-text a.selectable-text.copyable-text';
                const phoneNumberLink = await waitForElement(phoneNumberLinkSelector, 10000, lastSentMessage);
                phoneNumberLink.click();

                // Wait for the "Chat with ....." button to appear and click it
                const chatButtonSelector = 'div[aria-label="Chat with "][style=""]';
                const chatButton = await waitForElement(chatButtonSelector);
                chatButton.click();

                // Wait for 1 second before proceeding to message contact box
                await wait(1000);

                if (imageUrl) {
                    sendDocument(imageUrl);
                    // Wait for 1 second before proceeding to message contact box
                    await wait(1000);
                }

                // Wait for the message box to appear and send the message
                const messageContactBoxSelector = 'div[contenteditable="true"][data-tab="10"]'; // Updated to the correct data-tab index
                const messageContactBox = await waitForElement(messageContactBoxSelector);

                await clearMessageBox(messageContactBox);
                await typeIntoElement(messageContactBox, message);

                // // Click the send button
                // const sendContactButtonSelector = 'span[data-icon="send"]';
                // const sendContactButton = await waitForElement(sendContactButtonSelector);
                // sendContactButton.click();
                checkForSendButton();
                console.log(`%cMessage sent`, 'color: green; font-weight: bold;');


                return true; // Message sent successfully
            } catch (error) {
                console.error(`Error sending message to ${contact}:`, error.toString());
                return false; // Failed to send message
            }
        }


        // Helper function to wait for the last sent message to appear
        async function waitForLastSentMessage() {
            return new Promise((resolve, reject) => {
                const startTime = Date.now();
                const interval = setInterval(() => {
                    const sentMessages = document.querySelectorAll('div.message-out');
                    const lastSentMessage = sentMessages[sentMessages.length - 1];
                    if (lastSentMessage) {
                        clearInterval(interval);
                        resolve(lastSentMessage);
                    } else if (Date.now() - startTime > 10000) { // Adjust timeout as needed
                        clearInterval(interval);
                        reject('Timeout waiting for last sent message');
                    }
                }, 100);
            });
        }

        // Helper function to clear message box content
        async function clearMessageBox(element) {
            element.focus();
            element.textContent = ''; // Clear the text content of the element
            element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: '' }));
            await wait(100); // Wait for changes to apply
        }

        // Helper function to type text into an element
        async function typeIntoElement(element, text) {
            element.focus();
            element.textContent = text;
            // Simulate typing into the element
            element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
        }

        // Helper function to wait for an element to appear
        function waitForElement(selector, timeout = 10000, parentElement = document) {
            return new Promise((resolve, reject) => {
                const startTime = Date.now();
                const interval = setInterval(() => {
                    const element = parentElement.querySelector(selector);
                    if (element) {
                        clearInterval(interval);
                        resolve(element);
                    } else if (Date.now() - startTime > timeout) {
                        clearInterval(interval);
                        reject(`Timeout waiting for element ${selector}`);
                    }
                }, 100);
            });
        }

        // Process each contact and send the message with a 2-second interval
        async function processContacts() {
            for (let i = 0; i < contacts.length; i++) {
                const contact = contacts[i].trim();
                const success = await sendMessageToContact(contact, message, imageUrl);
                if (success) {
                    console.log(`%cMessage sent to ${contact} : Success`, 'color: green; font-weight: bold;');
                }
                else {
                    console.log(`%cMessage sent to ${contact} : Failed`, 'color: red; font-weight: bold;');
                }
                // Wait for 2 seconds before sending the next message
                await wait(2000);
            }
            return { status: "Messages sent" };
        }

        // Start processing contacts
        try {
            const result = await processContacts();
            sendResponse(result);
        } catch (error) {
            console.log('Error processing contacts:', error.toString());
            sendResponse({ status: "Error sending messages", error: error.message });
        }


        async function sendDocument(fileUrl) {
            console.log("%cSending Image from URL", 'color: blue; font-weight: bold;');

            waitForElm('[data-icon="attach-menu-plus"]').then((elm) => {
                //   elm[0].click();
                //   console.log("Clicked on clip icon");

                // Simulate selecting a file
                waitForElm('input[type="file"]').then((input) => {
                    fetch(fileUrl)
                        .then(res => res.blob())
                        .then(async blob => {
                            const dT = new ClipboardEvent("").clipboardData || new DataTransfer();
                            dT.items.add(new File([blob], "file.jpg", { type: "image/jpeg" }));
                            input[0].files = dT.files;

                            var evt = new Event('change', {
                                'bubbles': true,
                                'cancelable': false,
                            });
                            input[0].dispatchEvent(evt);

                            // After attaching the file, check for the send button
                            checkForSendButton();
                            // Wait for 1 second before proceeding to message contact box
                            await wait(1000);
                            console.log("%cImage attached and sent", 'color: green; font-weight: bold;');
                        })
                        .catch(err => {
                            console.error("Error fetching Image:", err);
                        });
                });
            });
        }

        function waitForElm(selector) {
            return new Promise((resolve) => {
                let element = document.querySelector(selector);
                if (element) {
                    resolve([element]);
                    return;
                }

                const observer = new MutationObserver((mutations) => {
                    const elm = document.querySelector(selector);
                    if (elm) {
                        resolve([elm]);
                        observer.disconnect();
                    }
                });

                observer.observe(document.body, {
                    childList: true,
                    subtree: true,
                    attributes: false,
                    characterData: false,
                });
            });
        }

        function checkForSendButton() {
            const maxAttempts = 30; // Max attempts to find the send button
            let attempts = 0;

            const sendInterval = setInterval(() => {
                attempts++;
                const sendButton = document.querySelector('span[data-icon="send"]');
                if (sendButton) {
                    clearInterval(sendInterval);
                    sendButton.click();
                } else if (attempts > maxAttempts) {
                    clearInterval(sendInterval);
                    console.error("Send button not found");
                }
            }, 100); // Check every 100ms
        }

        async function wait(time) {
            await new Promise(resolve => setTimeout(resolve, time));
        }

        return true; // Keep the messaging channel open for sendResponse
    }
});


