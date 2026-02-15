import { useEffect, useState } from "react";
import "../styles/receipts.css";
import { db } from "../firebase";
import { ref, get, child, remove } from "firebase/database";
import { jsPDF } from "jspdf";
import logo from "../images/logo.jpg";

export default function Receipts() {
  const [transactions, setTransactions] = useState([]);
  const [currentUserRole, setCurrentUserRole] = useState("");

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role) setCurrentUserRole(role);
  }, []);

  const transactionsRef = ref(db, "transactions");

  const fetchTransactions = async () => {
    const snapshot = await get(child(ref(db), "transactions"));
    const data = snapshot.val() || {};

    const txs = Object.keys(data).map(key => ({
      id: key,
      ...data[key]
    }));

    txs.sort((a, b) => {
      const getTime = (t) => {
        if (!t) return 0;
        const parsed = new Date(t).getTime();
        return Number.isNaN(parsed) ? 0 : parsed;
      };

      return getTime(b.finishedAt) - getTime(a.finishedAt);
    });

    setTransactions(txs);
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

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
          resolve({ dataUrl: canvas.toDataURL('image/jpeg'), width: img.width, height: img.height });
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = (e) => reject(e);
      img.src = url;
    });
  };

  const generatePDF = async (tx) => {
    const doc = new jsPDF();

    // try to add logo
    try {
      const imgObj = await imageToDataUrl(logo);
      const desiredWidth = 40;
      const desiredHeight = (imgObj.height / imgObj.width) * desiredWidth;
      doc.addImage(imgObj.dataUrl, 'JPEG', 85, 10, desiredWidth, desiredHeight);
    } catch (err) {
      console.error('Failed to load logo for PDF:', err);
    }

    let dateObj;
    if (tx.finishedAt) {
      dateObj = typeof tx.finishedAt.toDate === "function" ? tx.finishedAt.toDate() : new Date(tx.finishedAt);
    } else {
      dateObj = new Date();
    }
    const formattedDate = dateObj.toLocaleDateString();
    const formattedTime = dateObj.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Toledo Doctors & Diagnostic Center", 105, 109, { align: "center" });

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Official Receipt", 105, 47, { align: "center" });

    doc.line(10, 54, 200, 54);

    doc.setFontSize(10);
    doc.text(`Customer Name: ${tx.customerName}`, 10, 62);

    const serviceList = tx.services?.map((s) => {
      const detail = s.details || s.detail || "";
      return detail ? `${s.serviceName} — ${detail}` : s.serviceName;
    }).join(", ") || "—";
    doc.text(`Services: ${serviceList}`, 10, 69);

    // totals and discount
    const subtotal = typeof tx.subtotal === 'number' ? tx.subtotal : (tx.services?.reduce((sum, s) => sum + (Number(s.price) || 0), 0) || 0);
    const discountPercent = Number(tx.discountPercent) || 0;
    const discountAmount = typeof tx.discountAmount === 'number' ? tx.discountAmount : Math.round((subtotal * (discountPercent / 100)) * 100) / 100;
    const finalTotal = typeof tx.total === 'number' ? tx.total : Math.round((subtotal - discountAmount) * 100) / 100;

    doc.text(`Subtotal: P${subtotal.toFixed(2)}`, 10, 74);
    if (discountPercent > 0) {
      doc.text(`Discount (${discountPercent}%): -P${discountAmount.toFixed(2)}`, 10, 79);
    }
    doc.text(`Total Price: P${finalTotal.toFixed(2)}`, 10, 84);

    doc.text(`Date: ${formattedDate}`, 10, 92);
    doc.text(`Time: ${formattedTime}`, 10, 97);

    doc.line(10, 99, 200, 99);
    doc.text("Thank you for trusting our services!", 105, 115, { align: "center" });

    doc.save(`receipt-${tx.customerName}-${tx.id}.pdf`);
  };

  const deleteTransaction = async (id) => {
    if (currentUserRole !== "admin") {
      alert("Only admin can delete receipts.");
      return;
    }

    if (window.confirm("Are you sure you want to delete this receipt?")) {
      await remove(ref(db, `transactions/${id}`));
      fetchTransactions();
    }
  };

  return (
    <div className="receipts-container">
      <h1 className="page-title">Receipts</h1>

      <div className="receipts-table">
        <table>
          <thead>
            <tr>
              <th>Customer Name</th>
              <th>Product</th>
              <th>Product Details</th>
              <th>Total Price</th>
              <th>Date & Time</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => {
              let dateObj = null;
              if (tx.finishedAt) {
                dateObj = typeof tx.finishedAt.toDate === "function" ? tx.finishedAt.toDate() : new Date(tx.finishedAt);
              } else {
                dateObj = new Date();
              }
              const formattedDate = dateObj.toLocaleDateString();
              const formattedTime = dateObj.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <tr key={tx.id}>
                  <td>{tx.customerName}</td>
                  <td>{tx.services?.map(s => s.serviceName).join(", ") || "—"}</td>
                  <td>{tx.services?.map(s => s.details || s.detail).filter(Boolean).join(", ") || "—"}</td>
                  <td>₱{(typeof tx.total === 'number' ? tx.total : Number(tx.total) || 0).toFixed(2)}</td>
                  <td>{formattedDate} {formattedTime}</td>
                  <td>
                    <button className="receipt-btn" onClick={() => generatePDF(tx)}>
                      Generate PDF
                    </button>

                    {currentUserRole === "admin" && (
                      <>
                        <br />
                        <button
                          className="receipt-btn delete"
                          onClick={() => deleteTransaction(tx.id)}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
