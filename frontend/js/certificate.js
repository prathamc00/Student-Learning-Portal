/**
 * certificate.js — Certificate PDF Generator
 * Uses html2canvas + jsPDF to capture the certificate DOM and download as a PDF.
 */

const CertGenerator = (() => {

    let currentCert = null;

    const CERTIFICATES = {
        'python': {
            name: 'Python Programming',
            student: 'Pratham Choudhary',
            instructor: 'Prof. Rao',
            director: 'Dr. A. Krishnan',
            date: '3 March 2026',
            score: '92%',
            id: 'CTP-2026-0031',
            emoji: '🐍',
            color: '#4facfe'
        },
        'digital': {
            name: 'Digital Literacy Basics',
            student: 'Pratham Choudhary',
            instructor: 'Prof. Gupta',
            director: 'Dr. A. Krishnan',
            date: '15 January 2026',
            score: '88%',
            id: 'CTD-2026-0007',
            emoji: '🌱',
            color: '#43e97b'
        }
    };

    // ── Open Viewer ──────────────────────────────────────────────────────────────
    function view(certKey) {
        currentCert = CERTIFICATES[certKey] || CERTIFICATES['python'];
        renderCert(currentCert);
        const modal = new bootstrap.Modal(document.getElementById('certModal'));
        modal.show();
    }

    // ── Render Certificate into DOM ──────────────────────────────────────────────
    function renderCert(cert) {
        document.getElementById('certPreview').innerHTML = `
      <div style="
        border: 12px solid #f0edff;
        border-radius: 12px;
        padding: 48px 40px;
        background: linear-gradient(145deg, #ffffff, #f9f7ff);
        position: relative;
        font-family: 'Segoe UI', sans-serif;
        text-align: center;
      ">
        <!-- Inner border decoration -->
        <div style="position:absolute;inset:10px;border:2px solid #c7d2fe;border-radius:6px;pointer-events:none;"></div>

        <!-- Corner decorations -->
        <div style="position:absolute;top:22px;left:22px;width:30px;height:30px;border-top:3px solid #4f46e5;border-left:3px solid #4f46e5;border-radius:3px 0 0 0;"></div>
        <div style="position:absolute;top:22px;right:22px;width:30px;height:30px;border-top:3px solid #4f46e5;border-right:3px solid #4f46e5;border-radius:0 3px 0 0;"></div>
        <div style="position:absolute;bottom:22px;left:22px;width:30px;height:30px;border-bottom:3px solid #4f46e5;border-left:3px solid #4f46e5;border-radius:0 0 0 3px;"></div>
        <div style="position:absolute;bottom:22px;right:22px;width:30px;height:30px;border-bottom:3px solid #4f46e5;border-right:3px solid #4f46e5;border-radius:0 0 3px 0;"></div>

        <div style="font-size:60px;margin-bottom:4px;">🏅</div>

        <div style="font-size:11px;font-weight:700;letter-spacing:4px;color:#9333ea;text-transform:uppercase;margin-bottom:6px;">
          CRISMATECH AUTOMATION
        </div>

        <div style="font-size:30px;font-weight:800;color:#4f46e5;letter-spacing:1px;margin-bottom:8px;">
          CERTIFICATE OF COMPLETION
        </div>

        <div style="width:80px;height:3px;background:linear-gradient(90deg,#4f46e5,#9333ea);border-radius:2px;margin:0 auto 20px;"></div>

        <p style="font-size:15px;color:#555;margin-bottom:4px;">This is to proudly certify that</p>

        <div style="font-size:26px;font-weight:800;color:#1a1a2e;border-bottom:2px solid #4f46e5;display:inline-block;padding-bottom:4px;margin-bottom:16px;">
          ${cert.student}
        </div>

        <p style="font-size:15px;color:#555;margin-bottom:8px;">has successfully completed the course</p>

        <div style="font-size:20px;font-weight:700;color:#4f46e5;background:#f0edff;display:inline-block;padding:8px 24px;border-radius:8px;margin-bottom:16px;">
          ${cert.emoji} ${cert.name}
        </div>

        <p style="font-size:14px;color:#777;">
          with a final score of <strong style="color:#22c55e;">${cert.score}</strong>
          &nbsp;·&nbsp; Issued on <strong>${cert.date}</strong>
        </p>

        <!-- Signatures -->
        <div style="display:flex;justify-content:space-around;margin-top:32px;padding-top:20px;border-top:1px solid #e5e7eb;">
          <div>
            <div style="font-family:Georgia,serif;font-style:italic;font-size:18px;color:#333;">${cert.instructor}</div>
            <div style="font-size:11px;color:#888;margin-top:2px;text-transform:uppercase;letter-spacing:1px;">Course Instructor</div>
          </div>
          <div style="display:flex;align-items:center;">
            <div style="width:70px;height:70px;border-radius:50%;background:linear-gradient(135deg,#4f46e5,#9333ea);display:flex;align-items:center;justify-content:center;font-size:28px;">🎓</div>
          </div>
          <div>
            <div style="font-family:Georgia,serif;font-style:italic;font-size:18px;color:#333;">${cert.director}</div>
            <div style="font-size:11px;color:#888;margin-top:2px;text-transform:uppercase;letter-spacing:1px;">Portal Director</div>
          </div>
        </div>

        <div style="margin-top:20px;font-size:11px;color:#aaa;">
          Cert ID: ${cert.id} &nbsp;·&nbsp; Verify at crismatech.com/verify
        </div>
      </div>`;

        // Update modal download button
        document.getElementById('downloadBtn').onclick = () => downloadPDF(cert);
        document.getElementById('printBtn').onclick = () => printCert();
    }

    // ── Download PDF ─────────────────────────────────────────────────────────────
    async function downloadPDF(cert) {
        const btn = document.getElementById('downloadBtn');
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1" role="status"></span> Generating…`;

        try {
            const el = document.getElementById('certPreview');

            // Use html2canvas to capture
            const canvas = await html2canvas(el, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false
            });

            const imgData = canvas.toDataURL('image/png');
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();

            // Scale image to fit page with margins
            const margin = 10;
            const maxW = pageW - margin * 2;
            const maxH = pageH - margin * 2;
            const ratio = canvas.width / canvas.height;
            let imgW = maxW, imgH = maxW / ratio;
            if (imgH > maxH) { imgH = maxH; imgW = maxH * ratio; }
            const x = (pageW - imgW) / 2;
            const y = (pageH - imgH) / 2;

            pdf.addImage(imgData, 'PNG', x, y, imgW, imgH);
            pdf.save(`Certificate_${cert.name.replace(/\s+/g, '_')}.pdf`);

            showToast('✅ Certificate downloaded as PDF!', 'success');
        } catch (err) {
            console.error('PDF generation error:', err);
            showToast('❌ PDF generation failed. Try the Print option instead.', 'danger');
        }

        btn.disabled = false;
        btn.innerHTML = '⬇️ Download PDF';
    }

    // ── Print ────────────────────────────────────────────────────────────────────
    function printCert() {
        const content = document.getElementById('certPreview').innerHTML;
        const win = window.open('', '_blank', 'width=1000,height=700');
        win.document.write(`<!DOCTYPE html><html><head>
      <title>Certificate</title>
      <style>
        body { margin: 0; padding: 20px; font-family: 'Segoe UI', sans-serif; }
        @media print { body { margin: 0; } }
      </style>
    </head><body>${content}<script>window.onload=()=>{window.print();window.close();}<\/script></body></html>`);
        win.document.close();
    }

    // ── Toast ────────────────────────────────────────────────────────────────────
    function showToast(msg, type = 'primary') {
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
            document.body.appendChild(container);
        }
        const colors = { success: '#22c55e', danger: '#ef4444', warning: '#f59e0b', primary: '#4f46e5' };
        const t = document.createElement('div');
        t.style.cssText = `background:${colors[type]};color:white;padding:12px 18px;border-radius:10px;font-weight:600;font-size:14px;box-shadow:0 4px 15px rgba(0,0,0,0.2);`;
        t.textContent = msg;
        container.appendChild(t);
        setTimeout(() => { t.style.opacity = '0'; t.style.transition = '0.3s'; setTimeout(() => t.remove(), 300); }, 3000);
    }

    return { view, downloadPDF, printCert };
})();
