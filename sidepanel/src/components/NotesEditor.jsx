import {
  FiAlignCenter,
  FiAlignLeft,
  FiAlignRight,
  FiBookOpen,
  FiBold,
  FiCheck,
  FiCode,
  FiCpu,
  FiHash,
  FiItalic,
  FiList,
  FiPlus,
  FiUnderline
} from "react-icons/fi";

function NotesEditor({
  aiStatus,
  isExtractingTodos,
  isSummarizingSelection,
  notesEditorRef,
  onAcceptSuggestedTodo,
  onApplyRichTextCommand,
  onCleanEmptyNote,
  onDismissSelectionSummary,
  onExtractTodos,
  onInsertCodeSnippet,
  onInsertSelectionSummary,
  onNotesInput,
  onNotesPaste,
  onSummarizeSelection,
  saveStatus,
  selectionSummary,
  suggestedTodos
}) {
  return (
    <>
      <div className="notes-header">
        <h2>Notes</h2>

        <div className="notes-header-actions">
          <span className="save-status">{saveStatus}</span>
        </div>
      </div>

      <div className="rich-text-toolbar">
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onApplyRichTextCommand("bold")}
          title="Bold"
          aria-label="Bold"
        >
          <FiBold />
        </button>

        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onApplyRichTextCommand("italic")}
          title="Italic"
          aria-label="Italic"
        >
          <FiItalic />
        </button>

        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onApplyRichTextCommand("underline")}
          title="Underline"
          aria-label="Underline"
        >
          <FiUnderline />
        </button>

        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() =>
            onApplyRichTextCommand("insertUnorderedList")
          }
          title="Bullet list"
          aria-label="Bullet list"
        >
          <FiList />
        </button>

        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onApplyRichTextCommand("insertOrderedList")}
          title="Numbered list"
          aria-label="Numbered list"
        >
          <FiHash />
        </button>

        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={onInsertCodeSnippet}
          title="Code snippet"
          aria-label="Code snippet"
        >
          <FiCode />
        </button>

        <span className="toolbar-divider" />

        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onApplyRichTextCommand("justifyLeft")}
          title="Align left"
          aria-label="Align left"
        >
          <FiAlignLeft />
        </button>

        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onApplyRichTextCommand("justifyCenter")}
          title="Align center"
          aria-label="Align center"
        >
          <FiAlignCenter />
        </button>

        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onApplyRichTextCommand("justifyRight")}
          title="Align right"
          aria-label="Align right"
        >
          <FiAlignRight />
        </button>

        <span className="toolbar-divider" />

        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={onExtractTodos}
          disabled={isExtractingTodos}
          title="Extract todos"
          aria-label="Extract todos from notes"
        >
          {isExtractingTodos ? <FiCpu /> : <FiCheck />}
        </button>

        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={onSummarizeSelection}
          disabled={isSummarizingSelection}
          title="Summarize selected page text"
          aria-label="Summarize selected page text"
        >
          {isSummarizingSelection ? <FiCpu /> : <FiBookOpen />}
        </button>
      </div>

      <div
        ref={notesEditorRef}
        className="notes-area rich-notes-area"
        contentEditable
        suppressContentEditableWarning
        data-placeholder="Write your notes here..."
        onInput={onNotesInput}
        onBlur={onCleanEmptyNote}
        onPaste={onNotesPaste}
      />

      {suggestedTodos.length > 0 && (
        <div className="suggested-todo-list notes-ai-result">
          {suggestedTodos.map((todo) => (
            <button
              key={todo}
              onClick={() => onAcceptSuggestedTodo(todo)}
            >
              <FiPlus />
              {todo}
            </button>
          ))}
        </div>
      )}

      {selectionSummary && (
        <div className="selection-summary-card notes-ai-result">
          <p>{selectionSummary}</p>
          <div className="selection-summary-actions">
            <button onClick={onInsertSelectionSummary}>
              Insert into Notes
            </button>
            <button onClick={onDismissSelectionSummary}>Dismiss</button>
          </div>
        </div>
      )}

      {aiStatus && <p className="inline-ai-status notes-ai-status">{aiStatus}</p>}
    </>
  );
}

export default NotesEditor;
