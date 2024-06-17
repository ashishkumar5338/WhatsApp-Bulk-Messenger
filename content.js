let sendingMessages = false;

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    // console.log("Message received in content script:", request);
    if (request.action === "sendMessages") {
        const { contacts, message, files, type, interval } = request;
        // const { urls: fileUrls, names: fileNames, types: fileTypes } = files;
        // console.log(interval);
        let wrongContact = [];
        let notRegistered = [];
        let fileNotSent = [];
        let sentContacts = [];
        let attachmentContacts = [];


        // Helper function to send a message to a single contact
        async function sendMessageToContact(contact, message, files, type, interval) {
            try {
                // Open a new chat with the contact
                await newChatButtonClick();
                await wait(interval.click);

                // Wait for the "Message yourself" option and click it
                await messageYourselfClick();
                await wait(interval.click);

                // Wait for the message box to appear and send the contact
                await sendMessageYourself(contact);
                await wait(interval.click);


                // Wait for 1 second before proceeding to message contact box
                await wait(1000);

                // Wait for the phone number link to appear and click it
                const lastSentMessage = await waitForLastSentMessage();
                const phoneNumberLinkSelector = 'span.selectable-text a.selectable-text.copyable-text';
                const phoneNumberLink = await waitForElement(phoneNumberLinkSelector, 5000, lastSentMessage);
                if (phoneNumberLink === "Timeout waiting for element span.selectable-text a.selectable-text.copyable-text") {
                    wrongContact.push(contact);

                    return false;
                } else {

                    phoneNumberLink.click();
                    await wait(interval.click);

                    // Wait for the "Chat with ....." button to appear and click it
                    const chatButtonSelector = 'div[aria-label="Chat with "]';
                    const chatButton = await waitForElement(chatButtonSelector);
                    if (chatButton === 'Timeout waiting for element div[aria-label="Chat with "]') {
                        notRegistered.push(contact);

                        return false;
                    } else {

                        chatButton.click();
                        await wait(interval.click);

                        // // Wait for 1 second before proceeding to message contact box
                        // await wait(1000);

                        if (!(message === '')) {
                            // Wait for the message box to appear and send the message
                            let messageStatus = await sendMessage(message);
                            if (messageStatus) {
                                sentContacts.push(contact);
                            }
                            await wait(interval.click);
                        }

                        // // Wait for 1 second before proceeding to message contact box
                        // await wait(1000);

                        // Attach all files at once
                        if (files.urls.length > 0) {
                            let fileStatus = await sendDocuments(type, files.urls, files.names, files.types);
                            if (!fileStatus) {
                                fileNotSent.push(contact);
                            } else {
                                attachmentContacts.push(contact);
                            }
                        }

                        return true; // Message sent successfully
                    }

                }
            } catch (error) {
                console.log(`%cError sending message to ${contact}: ${error.toString()}`, 'color: blue; font-weight: bold;');
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
                    } else if (Date.now() - startTime > 5000) { // Adjust timeout as needed
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
        function waitForElement(selector, timeout = 5000, parentElement = document) {
            return new Promise((resolve, reject) => {
                const startTime = Date.now();
                const interval = setInterval(() => {
                    const element = parentElement.querySelector(selector);
                    if (element) {
                        clearInterval(interval);
                        resolve(element);
                    } else if (Date.now() - startTime > timeout) {
                        clearInterval(interval);
                        resolve(`Timeout waiting for element ${selector}`);
                    }
                }, 100);
            });
        }

        async function checkForSendButton() {
            const maxAttempts = 30; // Max attempts to find the send button
            let attempts = 0;

            const sendInterval = setInterval(async () => {
                attempts++;
                const sendButton = document.querySelector('span[data-icon="send"]');
                if (sendButton) {
                    clearInterval(sendInterval);
                    sendButton.click();
                } else if (attempts > maxAttempts) {
                    clearInterval(sendInterval);
                    console.log("%cSend button not found", 'color: blue; font-weight: bold;');
                }
            }, 100); // Check every 100ms
        }

        async function sendDocuments(type, fileUrls, fileNames, fileTypes) {
            console.log("%cSending Files from URLs", 'color: green; font-weight: bold;');
            const attachMenuSelector = '[data-icon="attach-menu-plus"]';
            let inputFileSelector;
            if (type == "document") {
                inputFileSelector = 'input[accept="*"][multiple][type="file"]';
            }
            else if (type == "image/video") {
                inputFileSelector = 'input[accept="image/*,video/mp4,video/3gpp,video/quicktime"][multiple][type="file"]';
            }
            else {
                inputFileSelector = 'input[type="file"]';
            }

            try {
                // Click on attach menu to open the file input
                const attachMenuButton = await waitForElement(attachMenuSelector);
                attachMenuButton.click();
                await wait(interval.click);

                // Simulate selecting multiple files
                const inputFile = await waitForElement(inputFileSelector);

                // Create a DataTransfer object and add files to it
                const dT = new ClipboardEvent("").clipboardData || new DataTransfer();
                for (let i = 0; i < fileUrls.length; i++) {
                    const response = await fetch(fileUrls[i]);
                    const blob = await response.blob();
                    dT.items.add(new File([blob], fileNames[i], { type: fileTypes[i] }));
                }
                inputFile.files = dT.files;

                const event = new Event('change', {
                    'bubbles': true,
                    'cancelable': false,
                });
                inputFile.dispatchEvent(event);
                await wait(interval.click);

                // After attaching the files, check for the send button
                await checkForSendButton();
                await wait(interval.click);
                console.log("%cAll Files attached and sent", 'color: green; font-weight: bold;');
            } catch (error) {
                console.log(`%cError sending Files : ${fileNames.join(",\t")}`, 'color: blue; font-weight: bold;');
                return false;
            }
            return true;
        }

        async function sendMessage(message) {
            const messageContactBoxSelector = 'div[contenteditable="true"][data-tab="10"]';
            const messageContactBox = await waitForElement(messageContactBoxSelector);
            await clearMessageBox(messageContactBox);
            await typeIntoElement(messageContactBox, message);
            await checkForSendButton();
            console.log(`%cMessage sent`, 'color: green; font-weight: bold;');
            return true;
        }

        async function sendMessageYourself(contact) {
            const messageSelfBoxSelector = 'div[contenteditable="true"][data-tab="10"]';
            const messageSelfBox = await waitForElement(messageSelfBoxSelector);
            await clearMessageBox(messageSelfBox);
            // Convert contact to string if it's an object
            const contactString = typeof contact === 'object' ? JSON.stringify(contact) : contact;

            // Type the contact into the message box
            await typeIntoElement(messageSelfBox, contactString);
            await checkForSendButton();
            console.log(`%cSelf Message sent - ${contact}`, 'color: green; font-weight: bold;');
        }

        async function messageYourselfClick() {
            const messageYourselfSelector = 'div._ak8j > div._ak8k._ao-u';
            const messageYourselfOption = await waitForElement(messageYourselfSelector);
            messageYourselfOption.click();
        }

        async function newChatButtonClick() {
            const newChatButtonSelector = 'div[role="button"][title="New chat"]';
            const newChatButton = await waitForElement(newChatButtonSelector);
            newChatButton.click();
        }


        // Function to log the results in a readable format
        function logResults() {
            // const sentContacts = contacts.filter(contact => !wrongContact.includes(contact) && !notRegistered.includes(contact));
            console.log("------Process Result-----\n\n" +
                // Format and print total contacts
                "Total Contacts - " + contacts.length + "\n\t" + contacts.join("\n\t") + "\n\n" +
                "Wrong Contact Number- " + wrongContact.length + "\n\t" + wrongContact.join("\n\t") + "\n\n" +
                "Contact Not Using WhatsApp - " + notRegistered.length + "\n\t" + notRegistered.join("\n\t") + "\n\n" +
                "Attachment sending failed to Contacts - " + fileNotSent.length + "\n\t" + fileNotSent.join("\n\t") + "\n\n" +
                "Message Successfully Sent to Contacts - " + sentContacts.length + "\n\t" + sentContacts.join("\n\t") + "\n\n" +
                "Attachment Successfully Sent to Contacts - " + attachmentContacts.length + "\n\t" + attachmentContacts.join("\n\t") + "\n\n" +
                "------Process Completed-----");
        }

        // Process each contact and send the message with a 2-second interval
        async function processContacts() {
            for (let i = 0; i < contacts.length; i++) {
                sendingMessages = true;
                const contact = contacts[i].trim();
                const success = await sendMessageToContact(contact, message, files, type, interval);
                if (success) {
                    console.log(`%cMessage sent to ${contact} : Success`, 'color: green; font-weight: bold;');
                } else {
                    console.log(`%cMessage sent to ${contact} : Failed`, 'color: red; font-weight: bold;');
                }
                // Wait for interval seconds before sending the next message
                await wait(interval.message);

                // Check if the stop flag is set
                if (!sendingMessages) {
                    console.log('Stopping message sending process...');
                    logResults();
                    return { status: "Message sending stopped." }; // Exit the loop if stop flag is true
                }
            }

            logResults();

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



        return true; // Keep the messaging channel open for sendResponse
    }

    if (request.action === "stopMessages") {
        try {
            sendingMessages = false;
            sendResponse({ status: "Message sending stopped." });
        } catch (error) {
            sendResponse({ status: "Error in stopping messages", error: error.message });
        }
    }

    async function wait(time) {
        // console.log("waiting : " + time / 1000 + "s");
        await new Promise(resolve => setTimeout(resolve, time));
    }

});
