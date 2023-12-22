<script lang="ts">
	import { readable } from 'svelte/store';
	import { createTable, Subscribe, Render } from '$lib';
	import { addGridLayout } from '$lib/plugins';

	import { createSamples } from '../_createSamples';

	const data = readable(createSamples(30));

	const table = createTable(data, {
		grid: addGridLayout(),
	});

	const columns = table.createColumns([
		table.column({
			header: 'First Name',
			accessor: 'firstName',
		}),
		table.column({
			header: 'Last Name',
			accessor: 'lastName',
		}),
		table.column({
			header: 'Age',
			accessor: 'age',
		}),
		table.column({
			header: 'Status',
			accessor: 'status',
		}),
		table.column({
			header: 'Visits',
			accessor: 'visits',
		}),
		table.column({
			header: 'Profile Progress',
			accessor: 'progress',
		}),
	]);

	const { headerRows, rows, tableHeadAttrs, tableAttrs, tableBodyAttrs } =
		table.createViewModel(columns);
</script>

<table {...$tableAttrs}>
	<thead {...$tableHeadAttrs}>
		{#each $headerRows as headerRow (headerRow.id)}
			<Subscribe rowAttrs={headerRow.attrs()} let:rowAttrs>
				<tr {...rowAttrs}>
					{#each headerRow.cells as cell (cell.id)}
						<Subscribe attrs={cell.attrs()} let:attrs>
							<th {...attrs}>
								<Render of={cell.render()} />
							</th>
						</Subscribe>
					{/each}
				</tr>
			</Subscribe>
		{/each}
	</thead>
	<tbody {...$tableBodyAttrs}>
		{#each $rows as row (row.id)}
			<Subscribe rowAttrs={row.attrs()} let:rowAttrs>
				<tr {...rowAttrs}>
					{#each row.cells as cell (cell.id)}
						<Subscribe attrs={cell.attrs()} let:attrs>
							<td {...attrs}>
								<Render of={cell.render()} />
							</td>
						</Subscribe>
					{/each}
				</tr>
			</Subscribe>
		{/each}
	</tbody>
</table>

<style>
	div {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}
	input {
		margin: 0;
	}
	table {
		border-spacing: 0;
		border-top: 1px solid black;
		border-left: 1px solid black;
	}
	th,
	td {
		border-bottom: 1px solid black;
		border-right: 1px solid black;
		padding: 0.5rem;
	}
</style>
