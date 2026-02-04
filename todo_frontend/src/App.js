import React, { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';

const STORAGE_KEY = 'kavia.todos.v1';

/**
 * Safely parse todos from localStorage.
 * Falls back to an empty array if data is missing/corrupt.
 */
function loadTodosFromStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Basic shape normalization
    return parsed
      .filter((t) => t && typeof t === 'object')
      .map((t) => ({
        id: typeof t.id === 'string' ? t.id : cryptoRandomId(),
        text: typeof t.text === 'string' ? t.text : '',
        createdAt: typeof t.createdAt === 'number' ? t.createdAt : Date.now(),
      }))
      .filter((t) => t.text.trim().length > 0);
  } catch {
    return [];
  }
}

function saveTodosToStorage(todos) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch {
    // Ignore quota/security errors; app still functions in-memory.
  }
}

/**
 * Generate a reasonably unique id without adding dependencies.
 * Uses crypto.randomUUID when available.
 */
function cryptoRandomId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

// PUBLIC_INTERFACE
function App() {
  const [theme, setTheme] = useState('light');

  const [todos, setTodos] = useState(() => loadTodosFromStorage());
  const [newText, setNewText] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');

  const newInputRef = useRef(null);
  const editInputRef = useRef(null);

  // Effect to apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Persist todos to localStorage (no backend calls)
  useEffect(() => {
    saveTodosToStorage(todos);
  }, [todos]);

  const remainingCount = useMemo(() => todos.length, [todos]);

  // PUBLIC_INTERFACE
  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const addTodo = (e) => {
    e.preventDefault();
    const text = newText.trim();
    if (!text) return;

    setTodos((prev) => [
      { id: cryptoRandomId(), text, createdAt: Date.now() },
      ...prev,
    ]);
    setNewText('');
    newInputRef.current?.focus();
  };

  const startEdit = (todo) => {
    setEditingId(todo.id);
    setEditingText(todo.text);
    // Focus after state update flush
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingText('');
  };

  const saveEdit = (id) => {
    const next = editingText.trim();
    if (!next) return; // keep edit open; user can cancel or type
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, text: next } : t)));
    setEditingId(null);
    setEditingText('');
  };

  const deleteTodo = (id) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    if (editingId === id) cancelEdit();
  };

  const onEditKeyDown = (e, id) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit(id);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          type="button"
        >
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>

        <main className="todo-shell" aria-label="Todo app">
          <div className="todo-card">
            <div className="todo-card__header">
              <div>
                <h1 className="todo-title">Todos</h1>
                <p className="todo-subtitle">
                  Stored locally in your browser (localStorage).
                </p>
              </div>
              <div className="todo-meta" aria-label="Todo count">
                {remainingCount} item{remainingCount === 1 ? '' : 's'}
              </div>
            </div>

            <form className="todo-form" onSubmit={addTodo}>
              <label className="sr-only" htmlFor="new-todo">
                Add a todo
              </label>
              <input
                id="new-todo"
                ref={newInputRef}
                className="todo-input"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="Add a todo…"
                autoComplete="off"
              />
              <button className="btn btn-primary" type="submit">
                Add
              </button>
            </form>

            {todos.length === 0 ? (
              <div className="todo-empty" role="status">
                No todos yet. Add one above.
              </div>
            ) : (
              <ul className="todo-list" aria-label="Todo list">
                {todos.map((t) => {
                  const isEditing = editingId === t.id;

                  return (
                    <li key={t.id} className="todo-item">
                      {isEditing ? (
                        <>
                          <label className="sr-only" htmlFor={`edit-${t.id}`}>
                            Edit todo
                          </label>
                          <input
                            id={`edit-${t.id}`}
                            ref={editInputRef}
                            className="todo-input todo-input--inline"
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            onKeyDown={(e) => onEditKeyDown(e, t.id)}
                          />
                          <div className="todo-actions">
                            <button
                              className="btn btn-primary"
                              type="button"
                              onClick={() => saveEdit(t.id)}
                              aria-label="Save todo"
                            >
                              Save
                            </button>
                            <button
                              className="btn btn-ghost"
                              type="button"
                              onClick={cancelEdit}
                              aria-label="Cancel edit"
                            >
                              Cancel
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="todo-text">{t.text}</div>
                          <div className="todo-actions">
                            <button
                              className="btn btn-ghost"
                              type="button"
                              onClick={() => startEdit(t)}
                              aria-label={`Edit todo: ${t.text}`}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-danger"
                              type="button"
                              onClick={() => deleteTodo(t.id)}
                              aria-label={`Delete todo: ${t.text}`}
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </main>
      </header>
    </div>
  );
}

export default App;
