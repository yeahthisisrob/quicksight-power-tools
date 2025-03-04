# QuickSight Power Tools

**QuickSight Power Tools** is an open-source Chrome extension designed to enhance your Amazon QuickSight experience. This tool currently focuses on improving workflow for calculated fields, dependency graphs, and change history management, with more features coming soon.

## Features

### 1. **Calculated Fields Management**
- **Export Calculated Fields**: Easily export and view all calculated fields in one place. No more hunting through dashboards to locate specific calculations—this tool brings them all together for better visibility and organization.
- **View Dependencies**: Understand which fields rely on others with our calculated field dependency reference feature. For a more complete view of the dependency chain, check out [QuickSight Visual Performance](https://github.com/yeahthisisrob/quicksight-visual-performance), which parses HAR files to provide deeper insights.

### 2. **Change History Management**
- **Track Changes**: Monitor and manage changes to your QuickSight assets. It retrieves the analysis and related events for datasets, data sources, and updates related to dashboards. **Note:** Changes to calculated fields are **not** tracked by Amazon QuickSight through CloudTrail events.
- **Entity Source Tracking**: Logs all changes related to a dashboard’s data source or dataset, helping you see how modifications affect your QuickSight environment.

### 3. **AWS Temporary Credentials Management**
- **Secure AWS Access**: The tool provides guidance and automation for obtaining AWS temporary credentials, ensuring secure access to your QuickSight data without needing long-term access keys.

## Development

### Prerequisites

- Node.js (version 14.x or higher)
- npm (version 6.x or higher)

### Local Development

To set up the project locally:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yeahthisisrob/quicksight-power-tools.git
   cd quicksight-power-tools
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build the Extension**:
   - After installing dependencies, build the project:
     ```bash
     npm run build
     ```
   - This will generate a `dist` directory containing the extension's build files.

4. **Load the Extension in Chrome**:
   - Open Google Chrome.
   - Navigate to the Extensions page by entering `chrome://extensions/` in the address bar.
   - Enable "Developer mode" by toggling the switch in the top right corner.
   - Click the "Load unpacked" button.
   - In the dialog that appears, select the `dist` directory from your cloned repository.
   - The extension should now appear in your list of installed extensions.

5. **Develop and Test**:
   - With the extension loaded, you can make changes to the source code.
   - After making changes, rebuild the project using `npm run build`.
   - Reload the extension in Chrome by clicking the refresh icon next to it on the Extensions page.

6. **Uninstall the Extension**:
   - To remove the extension, navigate to the Extensions page (`chrome://extensions/`).
   - Locate "QuickSight Power Tools" and click the "Remove" button.

## Contributing

We welcome contributions from the community! Whether it's filing an issue, requesting a feature, or submitting a pull request, we encourage developers to get involved. Please review our [Contributing Guidelines](#) before getting started.

## License

This project is licensed under the MIT License—see the [LICENSE](#) file for details.

## Disclaimer

QuickSight Power Tools uses temporary AWS credentials for accessing your QuickSight resources. Please ensure the correct IAM permissions are applied when using the tool. The maintainers of this project are not responsible for any security risks arising from improper credential management.
