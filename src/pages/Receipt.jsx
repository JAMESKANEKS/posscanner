import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../firebase";
import { ref, get, child } from "firebase/database";
import { jsPDF } from "jspdf";
import logo from "../images/logo.jpg";
import "../styles/receipts.css";

export default function Receipt() {
  const { id } = useParams();
  const [tx, setTx] = useState(null);

  useEffect(() => {
    if (!id) return;
    const fetchTx = async () => {
      const snapshot = await get(child(ref(db), `transactions/${id}`));
      if (snapshot.exists()) setTx({ id: snapshot.key, ...snapshot.val() });
      else setTx(null);
    };
    fetchTx();
  }, [id]);

  const imageToDataUrl = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg'));
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = (e) => reject(e);
      img.src = url;
    });
  };

  const generatePDF = async (t) => {
    if (!t) return;
    const pdf = new jsPDF();

    try {
      const imgObj = await imageToDataUrl(logo);
      const desiredWidth = 40;
      const desiredHeight = (imgObj.height / imgObj.width) * desiredWidth;
      pdf.addImage(imgObj.dataUrl, 'JPEG', 85, 10, desiredWidth, desiredHeight);
    } catch (err) {
      console.error('Failed to load logo for PDF:', err);
    }

    const dateObj = t.finishedAt ? (t.finishedAt.toDate ? t.finishedAt.toDate() : new Date(t.finishedAt)) : new Date();
    const formattedDate = dateObj.toLocaleDateString();
    const formattedTime = dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text("Toledo Doctors & Diagnostic Center", 105, 40, { align: "center" });

    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");
    pdf.text("Official Receipt", 105, 47, { align: "center" });
    pdf.line(10, 54, 200, 54);

    pdf.setFontSize(10);
    pdf.text(`Customer Name: ${t.customerName || '—'}`, 10, 62);
    const serviceList = t.services?.map(s => s.serviceName).join(", ") || "—";
    pdf.text(`Services: ${serviceList}`, 10, 69);
    const total = typeof t.total === 'number' ? t.total : Number(t.total) || 0;
    const totalDisplay = `P${Math.round(total)}`;
    pdf.text(`Total Price: ${totalDisplay}`, 10, 77);
    pdf.text(`Date: ${formattedDate}`, 10, 85);
    pdf.text(`Time: ${formattedTime}`, 10, 92);

    pdf.line(10, 99, 200, 99);
    pdf.text("Thank you for trusting our services!", 105, 107, { align: "center" });

    pdf.save(`receipt-${t.customerName || 'customer'}-${t.id}.pdf`);
  };

  return (
    <div className="receipts-container">
      <h1 className="page-title">Receipt</h1>
      {!tx && <p>Loading receipt...</p>}
      {tx && (
        <div className="receipt-details">
          <p><strong>Customer:</strong> {tx.customerName}</p>
          <p><strong>Services:</strong> {tx.services?.map(s => s.serviceName).join(', ') || '—'}</p>
          <p><strong>Total:</strong> ₱{(typeof tx.total === 'number' ? tx.total : 0).toFixed(2)}</p>
          <button className="receipt-btn" onClick={() => generatePDF(tx)}>Generate PDF</button>
        </div>
      )}
    </div>
  );
}
