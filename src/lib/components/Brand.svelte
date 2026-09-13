<a class="brand" href="/" aria-label="MIVUBI, ke halaman depan">
	<!-- Logo dipasang sebagai mask, bukan <img>, supaya warnanya ikut --ink:
	     satu berkas melayani tema terang, tema gelap, dan landing yang dikunci terang. -->
	<span class="mark" aria-hidden="true"></span>
</a>

<style>
	.brand {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		/* Logo tanpa wordmark tetap harus seluas sasaran sentuh. */
		min-width: 44px;
		min-height: 44px;
		color: var(--ink);
		text-decoration: none;
	}
	.mark {
		width: 30px;
		height: 30px;
		flex: none;
		background: currentColor;
		-webkit-mask: url('/logo/mark.png') no-repeat center / contain;
		mask: url('/logo/mark.png') no-repeat center / contain;
	}
</style>
