function SearchForm({ query, onChange, onSearch, onStop, isPolling, loading }) {
  function handleSubmit(e) {
    e.preventDefault();
    onSearch();
  }

  function handleChange(e) {
    onChange((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  return (
    <form className="search-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="Semester">Semester</label>
          <input
            id="Semester"
            name="Semester"
            type="text"
            value={query.Semester}
            onChange={handleChange}
            placeholder="e.g. 1142"
          />
        </div>

        <div className="form-group">
          <label htmlFor="CourseNo">Course No.</label>
          <input
            id="CourseNo"
            name="CourseNo"
            type="text"
            value={query.CourseNo}
            onChange={handleChange}
            placeholder="e.g. CS3001"
          />
        </div>

        <div className="form-group">
          <label htmlFor="CourseName">Course Name</label>
          <input
            id="CourseName"
            name="CourseName"
            type="text"
            value={query.CourseName}
            onChange={handleChange}
            placeholder="e.g. Java"
          />
        </div>

        <div className="form-group">
          <label htmlFor="CourseTeacher">Teacher</label>
          <input
            id="CourseTeacher"
            name="CourseTeacher"
            type="text"
            value={query.CourseTeacher}
            onChange={handleChange}
            placeholder="e.g. 陳教授"
          />
        </div>
      </div>

      <div className="form-actions">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? "Searching…" : isPolling ? "Refresh Now" : "Search & Watch"}
        </button>

        {isPolling && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onStop}
          >
            Stop Watching
          </button>
        )}
      </div>
    </form>
  );
}

export default SearchForm;
