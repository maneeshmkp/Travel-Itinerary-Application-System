const LOGIN_MESSAGE = "Please login to use Travel Assistant"

/**
 * Open AI chat — optionally seed with a search-box query.
 * @param {import('react-router-dom').NavigateFunction} navigate
 * @param {boolean} isAuthenticated
 * @param {string} [query]
 */
export function navigateToAskAi(navigate, isAuthenticated, query = "") {
  const trimmed = String(query || "").trim()
  const chatState = trimmed ? { initialMessage: trimmed } : undefined

  if (!isAuthenticated) {
    navigate("/login", {
      state: {
        from: { pathname: "/chat", state: chatState },
        message: LOGIN_MESSAGE,
      },
    })
    return
  }

  navigate("/chat", { state: chatState })
}
