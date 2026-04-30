document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize Blockchain
    await nexChain.loadChain();
    renderLedger();

    // 2. Navigation Logic
    const navBtns = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('.tab-content');

    navBtns.forEach(btn => {
        if(btn.id === 'logout-btn') return; // Skip logout for normal tab switching

        btn.addEventListener('click', () => {
            // Remove active from all
            navBtns.forEach(b => { if(b.id !== 'logout-btn') b.classList.remove('active') });
            sections.forEach(s => s.classList.remove('active'));

            // Add active to clicked target
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');

            // If ledger is opened, refresh it
            if(targetId === 'ledger-section') {
                renderLedger();
            }
        });
    });

    // 2.5 Authentication Logic
    let loggedInCollege = null;

    const loginForm = document.getElementById('login-form');
    if(loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const user = document.getElementById('login-username').value;
            const pass = document.getElementById('login-password').value;
            
            if (user === 'admin' && pass === 'password') {
                loggedInCollege = "University of Tech";
                document.getElementById('login-portal').classList.add('hidden');
                document.getElementById('issue-portal').classList.remove('hidden');
                document.getElementById('issuerInstitution').value = loggedInCollege;
                document.getElementById('logout-btn').classList.remove('hidden');
                document.getElementById('login-error').classList.add('hidden');
            } else {
                document.getElementById('login-error').classList.remove('hidden');
            }
        });
    }

    const logoutBtn = document.getElementById('logout-btn');
    if(logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            loggedInCollege = null;
            document.getElementById('login-portal').classList.remove('hidden');
            document.getElementById('issue-portal').classList.add('hidden');
            document.getElementById('logout-btn').classList.add('hidden');
            document.getElementById('login-form').reset();
            
            // Navigate back to Issue section tab securely
            document.querySelector('[data-target="issue-section"]').click();
        });
    }

    // 3. Issue Certificate Form Submission
    const issueForm = document.getElementById('issue-form');
    if(issueForm) {
        issueForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if(!loggedInCollege) {
                alert("Unauthorized");
                return;
            }
            
            // Change button state
            const submitBtn = issueForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Minting...';
            submitBtn.disabled = true;

            const studentName = document.getElementById('studentName').value;
            const courseName = document.getElementById('courseName').value;
            const graduationDate = document.getElementById('graduationDate').value;
            
            const shortId = 'CERT-' + Math.random().toString(36).substring(2, 8).toUpperCase();

            const certData = {
                shortId,
                studentName,
                courseName,
                graduationDate,
                issuerInstitution: loggedInCollege,
                issuedAt: new Date().toISOString()
            };

            // Create new Block
            const newBlock = new Block(nexChain.chain.length, new Date().toISOString(), certData);
            await nexChain.addBlock(newBlock);

            // Reset form and show success
            issueForm.reset();
            document.getElementById('issuerInstitution').value = loggedInCollege; // Restore readonly field
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;

            const successAlert = document.getElementById('issue-success');
            const newCertId = document.getElementById('new-cert-id');
            newCertId.textContent = shortId;
            successAlert.classList.remove('hidden');
        });
    }

    // 4. Verify Certificate Submission
    const verifyForm = document.getElementById('verify-form');
    if(verifyForm) {
        verifyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const searchHash = document.getElementById('searchHash').value.trim();
            const verifyBtn = verifyForm.querySelector('button[type="submit"]');
            const originalText = verifyBtn.innerHTML;
            
            verifyBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying...';
            verifyBtn.disabled = true;
            
            const resultArea = document.getElementById('verify-result');
            resultArea.classList.add('hidden');
            resultArea.innerHTML = '';

            // Simulate network delay for UX
            setTimeout(async () => {
                // Check blockchain integrity first
                const isChainValid = await nexChain.isChainValid();
                if (!isChainValid) {
                    renderVerificationResult(null, false, "CRITICAL ERROR: Blockchain integrity compromised!", null);
                    verifyBtn.innerHTML = originalText;
                    verifyBtn.disabled = false;
                    return;
                }

                const blockData = nexChain.getCertificateByShortId(searchHash);
                
                if (blockData) {
                    renderVerificationResult(blockData.data, true, blockData.hash, searchHash);
                } else {
                    renderVerificationResult(null, false, "No certificate found for this ID.", null);
                }

                verifyBtn.innerHTML = originalText;
                verifyBtn.disabled = false;
            }, 800);
        });
    }
});

function renderVerificationResult(data, isValid, hash, shortId) {
    const resultArea = document.getElementById('verify-result');
    resultArea.classList.remove('hidden');

    if (isValid) {
        resultArea.innerHTML = `
            <div class="certificate-card">
                <div class="cert-header">
                    <h3>Certificate of Completion</h3>
                    <p>Verified on NexChain</p>
                    <p style="color: var(--success); font-weight: bold; margin-top: 5px;">ID: ${shortId}</p>
                </div>
                <div class="cert-body">
                    <div class="cert-detail">
                        <span>Student Name</span>
                        <span>${data.studentName}</span>
                    </div>
                    <div class="cert-detail">
                        <span>Course</span>
                        <span>${data.courseName}</span>
                    </div>
                    <div class="cert-detail">
                        <span>Graduation Date</span>
                        <span>${new Date(data.graduationDate).toLocaleDateString()}</span>
                    </div>
                    <div class="cert-detail">
                        <span>Issuer</span>
                        <span>${data.issuerInstitution}</span>
                    </div>
                </div>
                <div class="cert-footer" style="font-size: 0.8rem;">
                    <i class="fa-solid fa-shield-check"></i> TX Hash: ${hash.substring(0, 20)}...${hash.substring(hash.length-20)}
                </div>
            </div>
        `;
    } else {
        resultArea.innerHTML = `
            <div class="invalid-card">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <h3>Verification Failed</h3>
                <p>${hash}</p>
            </div>
        `;
    }
}

function renderLedger() {
    const container = document.getElementById('blockchain-blocks');
    container.innerHTML = '';

    // Reverse to show newest block at the top
    const reversedChain = [...nexChain.chain].reverse();

    reversedChain.forEach(block => {
        const blockEl = document.createElement('div');
        blockEl.className = 'block-card';
        
        const isGenesis = block.index === 0;
        const dataStr = isGenesis ? block.data : `ID: <strong>${block.data.shortId}</strong> | ${block.data.studentName}`;

        blockEl.innerHTML = `
            <div class="block-header">
                <span class="block-index">Block #${block.index}</span>
                <span class="block-time">${new Date(block.timestamp).toLocaleString()}</span>
            </div>
            <div class="block-data" style="margin-bottom: 1rem; color: var(--text-muted); font-size: 0.9rem;">
                <strong>Data:</strong> ${dataStr}
            </div>
            <div class="block-hashes">
                <div class="hash-row">
                    <span class="hash-label">Previous Hash</span>
                    <span class="hash-value prev">${block.previousHash.substring(0, 32)}...</span>
                </div>
                <div class="hash-row" style="margin-top: 0.5rem;">
                    <span class="hash-label">Block Hash</span>
                    <span class="hash-value">${block.hash.substring(0, 32)}...</span>
                </div>
            </div>
        `;
        container.appendChild(blockEl);
    });
}

function copyToClipboard(elementId) {
    const text = document.getElementById(elementId).innerText;
    navigator.clipboard.writeText(text).then(() => {
        alert("ID copied to clipboard!");
    }).catch(err => {
        console.error('Could not copy text: ', err);
    });
}
