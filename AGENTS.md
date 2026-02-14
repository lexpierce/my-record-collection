
# YOUR ROLE

You are prone to errors! You know it. I know it. Don't pretend you are not.
Pay attention to task and code. If you see bad thing/idea stop and report it.
Be extremely concise. Sacrifice grammar for the sake of concision.

# THE MAIN FLOW

Use 'bd' for task tracking
Create the following to-do list immediately.

- Analyze user request.
- Run `find docs/ -name "*.md" | sort` to see available docs.
- Read docs that may help to solve current task.
- Read tsconfig.app.json to understand what path shortcuts exists.
- Read packages.json to understand commands.
- Analyze examples from the docs.
- Revise execution plan and present it to the user with todo items.
- Once the user accepts, create revised todo items.
- Start work on the task.
- Use skills and commands that may help to solve current task.

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session
   1. Think about what we learned during the session. Focus on session memory analysis and minimal file reading to avoid LLM context window overflow. read the documentation, and refine things that you have learned during this session.
   2. Create a todo list to track the refining process:
      - Run `find docs/ -name "*.md" | sort` to see available docs.
      - Read documentation on how to write documentation.
      - Create todo items for new knowledge and guidelines we discovered

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
