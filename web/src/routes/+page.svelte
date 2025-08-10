<script lang="ts">
    import Button from '$lib/ui/generic/Button.svelte';
import { Provider, WalletUnlocked } from 'fuels';
    function increment() {
      console.log('Incrementing...');
    }
</script>

<Button onclick={increment}>increment</Button>