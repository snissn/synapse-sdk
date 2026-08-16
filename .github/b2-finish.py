import json
from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str) -> None:
    file_path = Path(path)
    text = file_path.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one anchor, found {count}')
    file_path.write_text(text.replace(old, new))


replace_once(
    'packages/synapse-sdk/src/types.ts',
    "import type { Chain } from '@filoz/synapse-core/chains'\n",
    "import type { BossDeploymentManifest } from '@filoz/synapse-core/boss'\n"
    "import type { Chain } from '@filoz/synapse-core/chains'\n",
    'Boss deployment type import',
)
replace_once(
    'packages/synapse-sdk/src/types.ts',
    "  /** Whether to use CDN for retrievals (default: false) */\n  withCDN?: boolean\n\n  /**\n   * Application identifier for namespace isolation.",
    "  /** Whether to use CDN for retrievals (default: false) */\n  withCDN?: boolean\n\n"
    "  /** Explicit Filecoin Boss deployment manifests. No network default is inferred. */\n"
    "  bossDeployments?: readonly BossDeploymentManifest[]\n\n"
    "  /**\n   * Application identifier for namespace isolation.",
    'SynapseOptions Boss deployment field',
)
replace_once(
    'packages/synapse-sdk/src/types.ts',
    "  /** Whether to use CDN for retrievals (default: false) */\n  withCDN?: boolean\n\n  /**\n   * Application identifier for namespace isolation.",
    "  /** Whether to use CDN for retrievals (default: false) */\n  withCDN?: boolean\n\n"
    "  /** Explicit Filecoin Boss deployment manifests. No network default is inferred. */\n"
    "  bossDeployments?: readonly BossDeploymentManifest[]\n\n"
    "  /**\n   * Application identifier for namespace isolation.",
    'SynapseFromClientOptions Boss deployment field',
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
