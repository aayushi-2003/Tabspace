import {
  FiAlignCenter,
  FiAlignLeft,
  FiAlignRight,
  FiBold,
  FiCode,
  FiHash,
  FiItalic,
  FiList,
  FiUnderline
} from "react-icons/fi";

function NotesEditor({
  notesEditorRef,
  onApplyRichTextCommand,
  onCleanEmptyNote,
  onInsertCodeSnippet,
  onNotesInput,
  onNotesPaste,
  saveStatus
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
    </>
  );
}

export default NotesEditor;
