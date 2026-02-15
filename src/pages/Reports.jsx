import { useState, useEffect } from "react";
import "../styles/reports.css";
import { db } from "../firebase";
import {
  ref,
  push,
  get,
  remove,
  child,
} from "firebase/database";

export default function Reports() {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [expenses, setExpenses] = useState([]);
  const [totalExpenses, setTotalExpenses] = useState(0);

  const expensesRef = ref(db, "expenses");

  // Load all expenses
  const loadExpenses = async () => {
    const snapshot = await get(child(ref(db), "expenses"));
    const data = snapshot.val() || {};
    const expensesList = Object.keys(data).map(key => ({
      id: key,
      ...data[key]
    }));

    // Sort expenses by date in descending order (newest first)
    const sortedData = expensesList.sort((a, b) => new Date(b.date) - new Date(a.date));
    setExpenses(sortedData);

    // Compute total
    const total = expensesList.reduce((sum, e) => sum + Number(e.amount), 0);
    setTotalExpenses(total);
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  // Add Expense
  const handleAddExpense = async (e) => {
    e.preventDefault();

    if (!amount) {
      alert("Amount is required");
      return;
    }

    await push(expensesRef, {
      amount: Number(amount),
      note: note || "No details",
      date: new Date().toISOString(),
    });

    setAmount("");
    setNote("");
    loadExpenses();
  };

  // Delete Expense
  const deleteExpense = async (id) => {
    if (window.confirm("Are you sure you want to delete this expense?")) {
      await remove(ref(db, `expenses/${id}`));
      loadExpenses();
    }
  };

  // Format date
  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString();
  };

  return (
    <div className="reports-container">
      <h1 className="page-title">Expense</h1>

      {/* Add Expense */}
      <form className="expense-form" onSubmit={handleAddExpense}>
        <input
          type="number"
          placeholder="Expense Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <textarea
          placeholder="Expense Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        ></textarea>

        <button className="button-primary" type="submit">
          Add Expense
        </button>
      </form>

      {/* Total Expenses */}
      <div className="total-expenses-box" style={{ display: "none"}}>
        <h2>Total Expenses</h2>
        <p className="total-amount">₱{totalExpenses.toLocaleString()}</p>
      </div>

      {/* Expense List */}
      <div className="expenses-list">
        <h2>Expense History</h2>

        <table>
          <thead>
            <tr>
              <th>Amount</th>
              <th>Note</th>
              <th>Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id}>
                <td>₱{e.amount.toLocaleString()}</td>
                <td>{e.note}</td>
                <td>{formatDate(e.date)}</td>
                <td>
                  <button
                    className="button-delete"
                    onClick={() => deleteExpense(e.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
