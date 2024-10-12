# Migrate ESM Imports

Migrate CommonJS imports to ESM imports with extensions.

## Table of Contents

- [Usage](#installation)
- [Options](#options)
- [Contributing](#contributing)
- [License](#license)

## Usage

To use this package without installing it globally, you can use `npx` or `pnpx`:

```sh
npx migrate-esm-imports [options] [inputs...]
pnpx migrate-esm-imports [options] [inputs...]
```

### Example

```sh
npx migrate-esm-imports src
```

## Options

- `-x, --exclude <patterns...>`: Directories or files to exclude (default: `['.git', 'node_modules', 'dist']`)
- `-c, --concurrency <number>`: Number of files to process concurrently (defaults to number of CPUs)
- `-d, --dry-run`: Perform a dry run without making any changes
- `-v, --verbose`: Enable verbose output
- `-e, --extensions <exts...>`: File extensions to process (default: `['js', 'jsx', 'ts', 'tsx', 'cjs', 'mjs', 'cts', 'mts']`)

## Contributing

Contributions are welcome! Please file an issue or open a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
