# Claude Code as a harness, in a container of its own. Build context: the harnesses/ folder.
# The image holds the pinned Claude Code, the pinned browser MCP server, this adapter and
# the contract. It holds no key and nothing of the task; the runner hands those in.
FROM node:22-bookworm-slim
WORKDIR /harness/claude-code
COPY claude-code/package.json claude-code/package-lock.json ./
# npm also fetches the build for Alpine (musl), which this image never runs: remove it.
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force \
    && rm -rf node_modules/@anthropic-ai/claude-code-linux-*-musl
COPY contract.ts /harness/contract.ts
COPY claude-code/*.ts ./
USER node
ENTRYPOINT ["node", "--disable-warning=ExperimentalWarning", "/harness/claude-code/run.ts"]
