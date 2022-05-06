import { derived, readable, writable, type Readable, type Writable } from 'svelte/store';
import { BodyRow, getBodyRows, getColumnedBodyRows } from './bodyRows';
import { DataColumn, getDataColumns, type Column } from './columns';
import type { Table } from './createTable';
import { getHeaderRows, HeaderRow } from './headerRows';
import type {
	AnyPlugins,
	AnyTablePropSet,
	PluginStates,
	TransformFlatColumnsFn,
	TransformRowsFn,
	UseTablePluginInstance,
} from './types/UseTablePlugin';
import { nonUndefined } from './utils/filter';

export type UseTableProps<Item, Plugins extends AnyPlugins = AnyPlugins> = {
	columns: Column<Item, Plugins>[];
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface UseTableState<Item, Plugins extends AnyPlugins = AnyPlugins> {
	data: Writable<Item[]>;
	columns: Column<Item, Plugins>[];
	visibleColumns: Readable<DataColumn<Item, Plugins>[]>;
	originalRows: Readable<BodyRow<Item>[]>;
	rows: Readable<BodyRow<Item>[]>;
}

export const useTable = <Item, Plugins extends AnyPlugins = AnyPlugins>(
	table: Table<Item, Plugins>,
	{ columns }: UseTableProps<Item, Plugins>
) => {
	const { data, plugins } = table;

	const flatColumns = readable(getDataColumns(columns));

	const originalRows = derived([data, flatColumns], ([$data, $flatColumns]) => {
		return getBodyRows($data, $flatColumns);
	});

	// _stores need to be defined first to pass into plugins for initialization.
	const _visibleColumns = writable<DataColumn<Item, Plugins>[]>([]);
	const _rows = writable<BodyRow<Item>[]>([]);
	const tableState: UseTableState<Item, Plugins> = {
		data,
		columns,
		visibleColumns: _visibleColumns,
		originalRows,
		rows: _rows,
	};

	const pluginInstances = Object.fromEntries(
		Object.entries(plugins).map(([pluginName, plugin]) => [
			pluginName,
			plugin({ pluginName, tableState }),
		])
	) as {
		[K in keyof Plugins]: UseTablePluginInstance<
			Item,
			{
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				PluginState: any;
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				ColumnOptions: any;
				TablePropSet: AnyTablePropSet;
			}
		>;
	};

	const pluginStates = Object.fromEntries(
		Object.entries(pluginInstances).map(([key, pluginInstance]) => [
			key,
			pluginInstance.pluginState,
		])
	) as PluginStates<Plugins>;

	const transformFlatColumnsFns: Readable<TransformFlatColumnsFn<Item>>[] = Object.values(
		pluginInstances
	)
		.map((pluginInstance) => pluginInstance.transformFlatColumnsFn)
		.filter(nonUndefined);

	const visibleColumns = derived(
		[flatColumns, ...transformFlatColumnsFns],
		([$flatColumns, ...$transformFlatColumnsFns]) => {
			let columns: DataColumn<Item, Plugins>[] = [...$flatColumns];
			$transformFlatColumnsFns.forEach((fn) => {
				columns = fn(columns) as DataColumn<Item, Plugins>[];
			});
			_visibleColumns.set(columns);
			return columns;
		}
	);

	const columnedRows = derived(
		[originalRows, visibleColumns],
		([$originalRows, $visibleColumns]) => {
			return getColumnedBodyRows(
				$originalRows,
				$visibleColumns.map((c) => c.id)
			);
		}
	);

	const transformRowsFns: Readable<TransformRowsFn<Item>>[] = Object.values(pluginInstances)
		.map((pluginInstance) => pluginInstance.transformRowsFn)
		.filter(nonUndefined);

	const rows = derived(
		[columnedRows, ...transformRowsFns],
		([$columnedRows, ...$transformFowsFns]) => {
			let transformedRows: BodyRow<Item, Plugins>[] = [...$columnedRows];
			$transformFowsFns.forEach((fn) => {
				transformedRows = fn(transformedRows) as BodyRow<Item, Plugins>[];
			});
			_rows.set(transformedRows);
			return transformedRows;
		}
	);

	const headerRows = derived(visibleColumns, ($visibleColumns) => {
		const $headerRows = getHeaderRows(
			columns,
			$visibleColumns.map((c) => c.id)
		);
		// Inject state.
		$headerRows.forEach((row) => {
			row.injectState(tableState);
			row.cells.forEach((cell) => {
				cell.injectState(tableState);
			});
		});
		// Apply plugin component hooks.
		Object.entries(pluginInstances).forEach(([pluginName, pluginInstance]) => {
			$headerRows.forEach((row) => {
				row.cells.forEach((cell) => {
					if (pluginInstance.hooks?.['thead.tr.th'] !== undefined) {
						cell.applyHook(pluginName, pluginInstance.hooks['thead.tr.th'](cell));
					}
				});
			});
		});
		return $headerRows as HeaderRow<Item, Plugins>[];
	});

	return {
		visibleColumns,
		headerRows,
		originalRows,
		rows,
		pluginStates,
	};
};