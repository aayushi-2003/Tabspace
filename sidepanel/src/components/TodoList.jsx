import {
  DragDropContext,
  Draggable,
  Droppable
} from "@hello-pangea/dnd";
import { FiCheck, FiPlus, FiTrash2 } from "react-icons/fi";

import {
  getTodoProgress
} from "../lib/workspaceUtils";

function TodoList({
  newTodo,
  onAddTodo,
  onNewTodoChange,
  onRemoveTodo,
  onReorderTodos,
  onTodoInputKeyDown,
  onTodoTextBlur,
  onTodoTextChange,
  onToggleTodo,
  selectedWorkspace
}) {
  const todos = selectedWorkspace.todos || [];

  return (
    <>
      <div className="todo-header">
        <h2>Todos</h2>
        <span>{getTodoProgress(todos).label}</span>
      </div>

      <div className="todo-input-row">
        <input
          type="text"
          placeholder="Add a todo..."
          value={newTodo}
          onChange={(e) => onNewTodoChange(e.target.value)}
          onKeyDown={onTodoInputKeyDown}
          className="todo-input"
        />

        <button className="add-todo-btn" onClick={onAddTodo}>
          <FiPlus />
        </button>
      </div>

      <DragDropContext onDragEnd={onReorderTodos}>
        <Droppable droppableId="todo-list">
          {(provided) => (
            <div
              className="todo-list"
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              {!todos.length && (
                <p className="empty-text">No todos yet</p>
              )}

              {todos.map((todo, index) => (
                <Draggable
                  key={todo.id || `${selectedWorkspace.id}-${index}`}
                  draggableId={
                    todo.id || `${selectedWorkspace.id}-${index}`
                  }
                  index={index}
                >
                  {(dragProvided, snapshot) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      {...dragProvided.dragHandleProps}
                      className={`todo-item ${
                        todo.done ? "todo-done" : ""
                      } ${
                        snapshot.isDragging ? "todo-dragging" : ""
                      }`}
                    >
                      <button
                        className="todo-check"
                        onClick={() => onToggleTodo(index)}
                      >
                        {todo.done && <FiCheck />}
                      </button>

                      <input
                        className="todo-text-input"
                        value={todo.text}
                        onChange={(e) =>
                          onTodoTextChange(index, e.target.value)
                        }
                        onBlur={(e) =>
                          onTodoTextBlur(index, e.target.value)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.currentTarget.blur();
                          }
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        aria-label="Todo text"
                      />

                      <button
                        className="todo-delete"
                        onClick={() => onRemoveTodo(index)}
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  )}
                </Draggable>
              ))}

              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </>
  );
}

export default TodoList;
