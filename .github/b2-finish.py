import json
from pathlib import Path


def replace_first(path: str, old: str, new: str, label: str) -> None:
    file_path = Path(path)
    text = file_path.read_text()
    if old not in text:
        raise SystemExit(f'{label}: anchor not found')
    file_path.write_text(text.replace(old, new, 1))


replace_first(
    'packages/synapse-sdk/src/types.ts',
    "import type { Chain } from '@filoz/synapse-core/chains'\n",
    "import type { BossDeploymentManifest } from '@filoz/synapse-core/boss'\n"
    "import type { Chain } from '@filoz/synapse-core/chains'\n",
    'Boss deployment type import',
)
for label in ('SynapseOptions', 'SynapseFromClientOptions'):
    replace_first(
        'packages/synapse-sdk/src/types.ts',
        "  /** Whether to use CDN for retrievals (default: false) */\n  withCDN?: boolean\n\n  /**\n   * Application identifier for namespace isolation.",
        "  /** Whether to use CDN for retrievals (default: false) */\n  withCDN?: boolean\n\n"
        "  /** Explicit Filecoin Boss deployment manifests. No network default is inferred. */\n"
        "  bossDeployments?: readonly BossDeploymentManifest[]\n\n"
        "  /**\n   * Application identifier for namespace isolation.",
        f'{label} Boss deployment field',
    )

index_path = Path('packages/synapse-sdk/src/index.ts')
index_text = index_path.read_text()
export_line = "export * from './services/index.ts'\n"
if export_line not in index_text:
    index_text = index_text.replace("export * from './errors/index.ts'\n", "export * from './errors/index.ts'\n" + export_line)
index_path.write_text(index_text)

package_path = Path('packages/synapse-sdk/package.json')
package = json.loads(package_path.read_text())
package['exports']['./services'] = {
    'import': './dist/src/services/index.js',
    'types': './dist/src/services/index.d.ts',
}
package['typesVersions']['*']['services'] = ['./dist/src/services']
package_path.write_text(json.dumps(package, indent=2) + '\n')

tsconfig_path = Path('packages/synapse-sdk/tsconfig.json')
tsconfig = json.loads(tsconfig_path.read_text())
entry_points = tsconfig['typedocOptions']['entryPoints']
if 'src/services/index.ts' not in entry_points:
    entry_points.append('src/services/index.ts')
tsconfig_path.write_text(json.dumps(tsconfig, indent=2) + '\n')
