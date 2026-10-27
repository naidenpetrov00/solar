"use client";

import { type Props } from "./product-editor-model";
import { ProductEditor } from "./product-editor";
import { ProductList } from "./product-list";

export function ProductWorkspace(props: Props) {
  if (props.requestedProduct === "new" && props.canManage)
    return (
      <ProductEditor key={`new:${props.categoryId}`} {...props} detail={null} />
    );
  if (props.selectedProduct)
    return (
      <ProductEditor
        key={props.selectedProduct.id}
        {...props}
        detail={props.selectedProduct}
      />
    );
  return <ProductList {...props} />;
}
