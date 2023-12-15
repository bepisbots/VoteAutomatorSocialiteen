// ==UserScript==
// @name         Vote Automator for socialiteen
// @namespace    http://tampermonkey.net/
// @version      2023-12-10
// @description  try to take over the world!
// @author       You
// @match        https://www.socialiteen.com/?p=12563
// @icon         https://www.google.com/s2/favicons?sz=64&domain=socialiteen.com
// @downloadURL  https://github.com/bepisbots/VoteAutomatorSocialiteen/raw/main/vote-for-socialiteen.user.js
// @grant        GM_cookie
// ==/UserScript==

(function() {
    'use strict';

    const votingConfig = {
        selectionTxt: 'Snhtqf%Utwhjqqf',
        votedAlreadyText: ['¡Tu voto ha sido registrado! Gracias por votar','Gracias, ya hemos contado tu voto.'],
        defaultSecondsToWait: 120,
        secondsIncrementOnfail: 5
    };

    let parentContainer;

    let originalAlert = window.alert;
    window.alert = function() {
        console.log("Alert suppressed:", arguments);
    };

    function showUI() {
        const bottomSection = document.createElement('div');
        bottomSection.innerHTML = `
  <p style="color: white;">Número de votos: <span id="votesValue">${localStorage.getItem('voteCounter')}</span></p>
  <p style="color: white;">Esperando hasta el próximo: <span id="secondsValue">0</span></p>
`;

        // Apply styles to the bottom section
        bottomSection.style.position = 'fixed';
        bottomSection.style.bottom = '0';
        bottomSection.style.left = '0';
        bottomSection.style.width = '100%';
        bottomSection.style.backgroundColor = 'black';
        bottomSection.style.color = 'white';
        bottomSection.style.padding = '10px'; // Adjust padding as needed
        bottomSection.style.zIndex = '9999'; // Ensure it's above other elements

        // Append the bottom section to the document body
        document.body.appendChild(bottomSection);
    }

    function updateSecondsRemaining(seconds) {
        const secondsValueElement = document.getElementById('secondsValue');
        if (secondsValueElement) {
            secondsValueElement.innerText = seconds;
        } else {
            console.error('Element with ID "secondsValue" not found.');
        }
    }

    function deobfuscateString(str) {
        return str.split('').map(char => String.fromCharCode(char.charCodeAt(0) - 5)).join('');
    }

    function isNumber(value) {
        return typeof value === 'number' && !isNaN(value);
    }

    function calculateTotal(expression) {
        // Split the expression by spaces to separate the numbers and operators
        const elements = expression.split(' ');

        // Extract the numbers and operator
        const num1 = parseInt(elements[0]);
        const operator = elements[1];
        const num2 = parseInt(elements[2]);

        // Perform the calculation based on the operator
        switch (operator) {
            case '+':
                return num1 + num2;
            case '-':
                return num1 - num2;
            default:
                return NaN; // Invalid operator
        }
    }

     function deleteAllCookies() {
        document.cookie.split(";").forEach(function(cookie) {
            var eqPos = cookie.indexOf("=");
            var name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
            document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
        });
    }

    function clearCookiesAndReloadPage() {
        deleteAllCookies();
        window.location.reload();
    }

    function getSecondsToWait() {
        const secondsToWait = parseInt(localStorage.getItem('secondsToWait'));
        if (!isNumber(secondsToWait)) {
            return votingConfig.defaultSecondsToWait;
        }
        return secondsToWait;
    }

    function getSuccessHistoryByWaitTime() {
        const storedValue = localStorage.getItem("successHistoryByWaitTime");
        return storedValue ? JSON.parse(storedValue) : {};
    }

    function resetSuccessHistoryByWaitTime() {
        const currentTimeEpoch = Date.now();
        let nextReset = parseInt(localStorage.getItem('resetSuccessHistoryByWaitTimeBy'));
        if (!isNumber(nextReset)) {
            nextReset = currentTimeEpoch;
        }
        if (nextReset <= currentTimeEpoch) {
            localStorage.removeItem('successHistoryByWaitTime');
            nextReset = nextReset + (1000 * 60 * 60);
            localStorage.setItem('resetSuccessHistoryByWaitTimeBy', nextReset.toString())
        }
    }

    function setSuccessHistoryByWaitTime(successHistoryByWaitTime) {
        localStorage.setItem("successHistoryByWaitTime", JSON.stringify(successHistoryByWaitTime));
        resetSuccessHistoryByWaitTime();
    }

    function increaseSecondsToWait(increase) {
        let secondsToWait = getSecondsToWait() + increase;
        if (secondsToWait < 5) {
            secondsToWait = 5;
        }
        localStorage.setItem('secondsToWait', secondsToWait.toString());
    }

    function getVotesCountMessage() {
        const voteCounter = parseInt(localStorage.getItem('voteCounter'));
        return "Numero de votos:" + voteCounter;
    }

    function showVotes() {
        console.log('Numero de votos:', getVotesCountMessage())
    }

    function countVotes() {
        let voteCounter = localStorage.getItem('voteCounter');
        if (!voteCounter) {
            voteCounter = 0;
        } else {
            voteCounter = parseInt(voteCounter);
        }
        voteCounter++;
        localStorage.setItem('voteCounter', voteCounter.toString());
        showVotes();
    }

    function countdown(seconds, executeAfter, messageFunction) {
        let currentSecond = 0;

        function displayCountdown() {
            if (currentSecond <= seconds) {
                const additionalMessage = messageFunction ? messageFunction(currentSecond) : '';
                updateSecondsRemaining(seconds - currentSecond);
                currentSecond += 1;
                setTimeout(displayCountdown, 1000); // Display countdown every 5 seconds
            } else {
                console.log("Countdown complete. Executing provided function...");
                executeAfter();
            }
        }
        displayCountdown();
    }

    let hasFailedVoting = false;

    function failureVoting() {
        if (hasFailedVoting) {
            return;
        }
        hasFailedVoting = true;

        const secondsToWait = getSecondsToWait();
        const successHistory = getSuccessHistoryByWaitTime();
        if (successHistory[secondsToWait] === undefined) {
            successHistory[secondsToWait] = 0;
        }
        successHistory[secondsToWait] = successHistory[secondsToWait] - 1;
        if (successHistory[secondsToWait] < 0) {
            increaseSecondsToWait(votingConfig.secondsIncrementOnfail);
        } else if (successHistory[secondsToWait - 1] === undefined || successHistory[secondsToWait - 1] >= -1) {
            increaseSecondsToWait(-1);
        } else {
            increaseSecondsToWait(1);
        }
        setSuccessHistoryByWaitTime(successHistory);
    }

    function successVoting() {
        countVotes();
        const secondsToWait = getSecondsToWait();
        const successHistory = getSuccessHistoryByWaitTime();
        if (successHistory[secondsToWait] === undefined) {
            successHistory[secondsToWait] = 0;
        }
        successHistory[secondsToWait] = successHistory[secondsToWait] + 1;
        setSuccessHistoryByWaitTime(successHistory);
        clearCookiesAndReloadPage();
        hasFailedVoting = false;
    }

    function validateOperation() {
        if (hasAlreadyVoted()) {
            const currentTimeEpoch = Date.now();
            const waitSeconds = getSecondsToWait();
            countdown(waitSeconds, clearCookiesAndReloadPage, getVotesCountMessage);
            return;
        }

        let suma = document.querySelector("#pds-maths-form span div span p")
        if (!suma) {
            setTimeout(validateOperation, 1000);
            return;
        }

        let operation = suma.innerText
        let total = calculateTotal(operation);
        document.querySelector('#pds-maths-form input[name="answer"]').value = total;

        const voteButton = parentContainer.querySelector(".pds-vote-button");
        voteButton.click();

        successVoting();
    }

    function clickButtonByAnswerText(answerText) {
        const answerSpans = document.querySelectorAll('.css-answer-span.pds-answer-span');
        let found = false;

        for (const answerSpan of answerSpans) {
            if (answerSpan.textContent.trim() === answerText) {
                answerSpan.click();
                found = true;
                parentContainer = answerSpan.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode;
                const voteButton = parentContainer.querySelector(".pds-vote-button");
                if (voteButton) {
                    voteButton.click();
                    break;
                }
            }
        }
        if (!found) {
            console.log(answerText + " not found.");
        }
    }

    function hasAlreadyVoted() {
        const elements = document.querySelectorAll('.pds-question-top');

        let found = false;
        elements.forEach(element => {
            if (votingConfig.votedAlreadyText.includes(element.innerText.trim())) {
                element.scrollIntoView({ behavior: 'smooth' });
                found = true;
                failureVoting();
            }
        });
        showVotes();
        return found;
    }

    function vote() {
        if (hasAlreadyVoted()) {
            showUI()
            setTimeout(clearCookiesAndReloadPage, 3000);
            return;
        }
        clickButtonByAnswerText(deobfuscateString(votingConfig.selectionTxt));
    }

    function init() {
        vote();
        showUI();
        validateOperation();
    }

    if (document.readyState !== 'loading') {
        init();
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }
})();
