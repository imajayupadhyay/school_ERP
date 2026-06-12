<?php

namespace App\Support;

use Illuminate\Support\Facades\Config;

/**
 * Thin reader over config/permissions.php. Provides the flat permission
 * catalog, grouped catalog for the matrix UI, and the default permission
 * sets for seeded system roles (with "<module>.*" wildcards expanded).
 */
class PermissionRegistry
{
    /**
     * Flat catalog: every permission with its metadata.
     *
     * @return array<int, array{key: string, module: string, module_label: string, action: string, label: string, group: string, is_special: bool, sort_order: int}>
     */
    public static function catalog(): array
    {
        $actionLabels = Config::get('permissions.action_labels', []);
        $special = Config::get('permissions.special_actions', []);
        $modules = Config::get('permissions.modules', []);

        $catalog = [];
        $sort = 0;

        foreach ($modules as $module => $config) {
            foreach ($config['actions'] as $action) {
                $catalog[] = [
                    'key' => "{$module}.{$action}",
                    'module' => $module,
                    'module_label' => $config['label'],
                    'action' => $action,
                    'label' => $actionLabels[$action] ?? ucfirst($action),
                    'group' => $config['group'],
                    'is_special' => in_array($action, $special, true),
                    'sort_order' => $sort++,
                ];
            }
        }

        return $catalog;
    }

    /**
     * All permission keys.
     *
     * @return array<int, string>
     */
    public static function keys(): array
    {
        return array_column(self::catalog(), 'key');
    }

    /**
     * Catalog grouped by display group, then module, for the matrix UI.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function grouped(): array
    {
        $actionLabels = Config::get('permissions.action_labels', []);
        $special = Config::get('permissions.special_actions', []);
        $modules = Config::get('permissions.modules', []);

        $groups = [];

        foreach ($modules as $module => $config) {
            $group = $config['group'];
            $groups[$group] ??= ['group' => $group, 'modules' => []];

            $groups[$group]['modules'][] = [
                'module' => $module,
                'label' => $config['label'],
                'actions' => array_map(fn (string $action) => [
                    'key' => "{$module}.{$action}",
                    'action' => $action,
                    'label' => $actionLabels[$action] ?? ucfirst($action),
                    'is_special' => in_array($action, $special, true),
                ], $config['actions']),
            ];
        }

        return array_values($groups);
    }

    /**
     * Seeded role templates.
     *
     * @return array<string, array<string, mixed>>
     */
    public static function roleTemplates(): array
    {
        return Config::get('permissions.roles', []);
    }

    /**
     * Slugs of owner roles (full access).
     *
     * @return array<int, string>
     */
    public static function ownerSlugs(): array
    {
        $owners = [];

        foreach (self::roleTemplates() as $slug => $template) {
            if ($template['is_owner'] ?? false) {
                $owners[] = $slug;
            }
        }

        return $owners;
    }

    /**
     * Resolved permission keys for a role template slug (backward-compat
     * fallback when a user has no role_id). Unknown slug => no permissions.
     *
     * @return array<int, string>
     */
    public static function templateKeys(string $slug): array
    {
        $template = self::roleTemplates()[$slug] ?? null;

        if ($template === null) {
            return [];
        }

        return self::expand($template['permissions'] ?? []);
    }

    /**
     * Resolve a role template's permission list to concrete keys.
     * '*' => every key; "<module>.*" => every action of that module.
     *
     * @param  string|array<int, string>  $permissions
     * @return array<int, string>
     */
    public static function expand(string|array $permissions): array
    {
        if ($permissions === '*') {
            return self::keys();
        }

        $all = self::keys();
        $resolved = [];

        foreach ((array) $permissions as $entry) {
            if (str_ends_with($entry, '.*')) {
                $module = substr($entry, 0, -2);
                foreach ($all as $key) {
                    if (str_starts_with($key, "{$module}.")) {
                        $resolved[] = $key;
                    }
                }

                continue;
            }

            if (in_array($entry, $all, true)) {
                $resolved[] = $entry;
            }
        }

        return array_values(array_unique($resolved));
    }
}
