# Tracepoint

**Open-source OSINT desktop application for Windows and macOS.**

Tracepoint is a cross-platform OSINT (Open Source Intelligence) desktop application designed to help users discover, analyse and organise publicly accessible online profiles and information.

The project aims to provide a clean, modern interface for searching usernames, identifying potential username variations, exploring public profiles and organising research into investigations.

Built with a focus on usability, modularity and privacy, Tracepoint is designed to keep investigation data locally on the user's device.

> **Project status:** Early development. Features listed below represent the project's intended functionality and may not yet be implemented.

## Features

### Username intelligence
- Search for usernames across supported public platforms.
- Identify exact username matches.
- Discover potential username variations and similarities.
- Search using supported identifiers and public profile URLs.
- Access discovered profiles through direct links.

### Platform coverage
- Modular platform integration system.
- Support for multiple social media platforms.
- Developer and gaming platform integrations.
- Extensible provider architecture for future integrations.

### Investigation management
- Create and organise investigations.
- Save interesting public profile results.
- Bookmark profiles.
- Add investigation notes.
- Maintain local search history.

### Reporting and analytics
- Export investigation results.
- Generate structured reports.
- View search statistics.
- Track information sources and discovery timestamps.

### Privacy
- Local-first data storage.
- SQLite database.
- No mandatory user accounts.
- No central investigation database.
- Secure handling of API credentials.

## Technology Stack

The planned technology stack includes:

| Technology | Purpose |
|---|---|
| Electron | Desktop application framework |
| React | User interface |
| TypeScript | Application logic |
| Node.js | Backend functionality |
| Vite | Development and build tooling |
| SCSS | Interface styling |
| SQLite | Local data storage |
| Electron Builder | Application packaging |

## Supported Platforms

Tracepoint is being developed for:

- Windows (`.exe`)
- macOS (`.dmg`)

The project aims to maintain a shared codebase across both operating systems.

## Development Roadmap

- [ ] Desktop application foundation
- [ ] Modern dashboard and navigation
- [ ] Username search interface
- [ ] Modular search engine
- [ ] First public-source integrations
- [ ] Username similarity matching
- [ ] Profile result management
- [ ] Local SQLite database
- [ ] Investigation management
- [ ] Bookmarks and search history
- [ ] Report generation
- [ ] Additional platform integrations
- [ ] Windows and macOS releases

## Responsible Use

Tracepoint is intended for legitimate OSINT research involving publicly accessible information.

Users are expected to respect privacy, applicable laws, platform terms of service and the rights of others.

The project is not intended to facilitate harassment, stalking, unauthorised access, private account enumeration or the collection of restricted personal information.

Search results should be independently verified. A matching username does not establish that two accounts belong to the same individual.

## Contributing

Contributions, suggestions, bug reports and improvements are welcome.

If you would like to contribute:

1. Fork the repository.
2. Create a branch for your changes.
3. Make your changes.
4. Submit a pull request describing your contribution.

Please retain the original copyright notices and attribution when redistributing the project, in accordance with the BSD 3-Clause Licence.

## Licence

Tracepoint is distributed under the **BSD 3-Clause Licence**.

You are free to modify, redistribute and build upon this project, provided you comply with the licence conditions.

See [LICENSE](LICENSE) for the full licence terms.

---

**Tracepoint** — Public Information. Structured Intelligence.
