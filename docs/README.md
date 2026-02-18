# Documentation

Welcome to the My Record Collection documentation. This documentation covers the API, components, features, development guidelines, and deployment instructions.

## Quick Links

- **[Style Guide](./STYLE_GUIDE.md)**: Documentation standards and conventions
- **[API Documentation](./api/README.md)**: REST API endpoints and usage
- **[Component Documentation](./components/README.md)**: React component reference
- **[Feature Documentation](./features/README.md)**: Application features and workflows
- **[Development Guidelines](./development/README.md)**: Coding standards and patterns
- **[Deployment Guide](./deployment/README.md)**: Deployment instructions and configuration

## Documentation Structure

```text
docs/
├── README.md               # This file — documentation index
├── STYLE_GUIDE.md          # Documentation standards
├── TODO.md                 # Known issues and future work
├── testing.md              # Testing guide (Vitest + RTL)
├── error-handling.md       # Error handling patterns
├── ui-ux.md                # UI/UX patterns and conventions
├── api/                    # API endpoint documentation
│   ├── README.md           # API overview
│   ├── discogs-client.md   # Discogs client reference
│   └── endpoints/          # Individual endpoint docs
│       └── health-check.md
├── components/             # Component usage and architecture
│   ├── README.md           # Component overview
│   ├── record-card.md      # RecordCard reference
│   ├── record-shelf.md     # RecordShelf reference
│   └── search-bar.md       # SearchBar reference
├── development/            # Development guidelines
│   ├── README.md           # Development overview
│   ├── coding-standards.md # Naming and patterns
│   └── database-schema.md  # Schema reference
├── features/               # Feature documentation
│   ├── README.md           # Feature overview
│   ├── flip-card-animation.md
│   └── vinyl-metadata.md
└── deployment/             # Deployment guides
    └── README.md           # Deployment overview
```

## Getting Started

1. **New to the project?** Start with the main [README](../README.md) in the project root
2. **Developing features?** Review [Development Guidelines](./development/README.md)
3. **Using the API?** See [API Documentation](./api/README.md)
4. **Building components?** Check [Component Documentation](./components/README.md)
5. **Deploying?** Follow the [Deployment Guide](./deployment/README.md)

## Contributing to Documentation

When adding or updating documentation:

1. Follow the [Style Guide](./STYLE_GUIDE.md)
2. Update docs in the same commit as code changes
3. Test all code examples before committing
4. Run markdown linter before submitting
5. Request documentation review in pull requests

## Documentation Standards

All documentation in this project follows the standards defined in [STYLE_GUIDE.md](./STYLE_GUIDE.md). Key principles:

- **Write for humans first**: Clear, concise, easy to scan
- **Keep docs close to code**: Update together
- **Show working examples**: Test all code snippets
- **Use consistent formatting**: Follow markdown conventions
- **Maintain actively**: Stale docs are worse than no docs

---

**Need help?** File an issue or reach out to the maintainers.
